#!/usr/bin/env python3
"""
Main entry point for the Policy Deep Learning Agent.
Receives JSON input from stdin and outputs JSON results to stdout.
"""

import sys
import json
import numpy as np
import torch
import traceback
import base64
import io
from typing import Dict, Any, Tuple, Optional, List

# Suppress warnings
import warnings
warnings.filterwarnings('ignore')

# Import local modules - add current directory to path for direct execution
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data_processor import PanelDataProcessor
from model import PanelTransformer
from trainer import PolicyTrainer, compute_feature_importance
from optimizer import PolicyOptimizer, RewardFunctionLoader, EvolutionaryOptimizer


def generate_plots(history: Dict, predictions: np.ndarray = None, 
                   targets: np.ndarray = None, feature_importance: Dict = None) -> list:
    """Generate visualization plots as base64 images."""
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import seaborn as sns
        
        plots = []
        
        # Training loss plot
        if 'train_loss' in history and len(history['train_loss']) > 0:
            fig, ax = plt.subplots(figsize=(10, 5))
            epochs = range(1, len(history['train_loss']) + 1)
            ax.plot(epochs, history['train_loss'], 'b-', label='Training Loss', linewidth=2)
            if 'val_loss' in history:
                ax.plot(epochs, history['val_loss'], 'r-', label='Validation Loss', linewidth=2)
            ax.set_xlabel('Epoch', fontsize=12)
            ax.set_ylabel('Loss', fontsize=12)
            ax.set_title('Training Progress', fontsize=14)
            ax.legend()
            ax.grid(True, alpha=0.3)
            
            buf = io.BytesIO()
            plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
            buf.seek(0)
            plots.append({
                'title': 'Training Progress',
                'image': base64.b64encode(buf.read()).decode('utf-8')
            })
            plt.close(fig)
        
        # Feature importance plot
        if feature_importance and len(feature_importance) > 0:
            fig, ax = plt.subplots(figsize=(10, max(5, len(feature_importance) * 0.4)))
            
            sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
            names = [f[0] for f in sorted_features]
            values = [f[1] for f in sorted_features]
            
            colors = plt.cm.viridis(np.linspace(0.3, 0.9, len(names)))
            bars = ax.barh(names, values, color=colors)
            ax.set_xlabel('Importance Score', fontsize=12)
            ax.set_title('Feature Importance', fontsize=14)
            ax.invert_yaxis()
            
            buf = io.BytesIO()
            plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
            buf.seek(0)
            plots.append({
                'title': 'Feature Importance',
                'image': base64.b64encode(buf.read()).decode('utf-8')
            })
            plt.close(fig)
        
        # Prediction vs Actual scatter plot
        if predictions is not None and targets is not None:
            fig, ax = plt.subplots(figsize=(8, 8))
            
            pred_flat = predictions.flatten()
            target_flat = targets.flatten()
            
            ax.scatter(target_flat, pred_flat, alpha=0.5, s=20)
            
            # Perfect prediction line
            min_val = min(target_flat.min(), pred_flat.min())
            max_val = max(target_flat.max(), pred_flat.max())
            ax.plot([min_val, max_val], [min_val, max_val], 'r--', linewidth=2, label='Perfect Prediction')
            
            ax.set_xlabel('Actual Values', fontsize=12)
            ax.set_ylabel('Predicted Values', fontsize=12)
            ax.set_title('Predictions vs Actual', fontsize=14)
            ax.legend()
            ax.grid(True, alpha=0.3)
            
            buf = io.BytesIO()
            plt.savefig(buf, format='png', dpi=100, bbox_inches='tight')
            buf.seek(0)
            plots.append({
                'title': 'Predictions vs Actual',
                'image': base64.b64encode(buf.read()).decode('utf-8')
            })
            plt.close(fig)
        
        return plots
        
    except Exception as e:
        return []


def _train_single_model(input_data: Dict, data: Dict, processor: PanelDataProcessor,
                        device: str, seed: Optional[int] = None) -> Tuple[Dict, Dict, np.ndarray]:
    """Train one model; return model_state, training_result, test_predictions."""
    if seed is not None:
        torch.manual_seed(seed)
        np.random.seed(seed)
    csv_data = input_data.get('data')
    data_type = input_data.get('dataType', 'panel')
    entity_col = input_data.get('entityCol')
    time_col = input_data.get('timeCol')
    feature_cols = input_data.get('featureCols', [])
    target_cols = input_data.get('targetCols', [])
    d_model = input_data.get('dModel', 128)
    num_heads = input_data.get('numHeads', 8)
    num_layers = input_data.get('numLayers', 4)
    d_ff = input_data.get('dFf', 512)
    dropout = input_data.get('dropout', 0.1)
    learning_rate = input_data.get('learningRate', 1e-4)
    batch_size = input_data.get('batchSize', 32)
    epochs = input_data.get('epochs', 100)
    lookback = input_data.get('lookback', 5)
    pred_horizon = input_data.get('predHorizon', 1)
    model = PanelTransformer(
        n_features=data['n_features'],
        n_targets=data['n_targets'],
        n_entities=data['n_entities'],
        d_model=d_model,
        num_heads=num_heads,
        num_layers=num_layers,
        d_ff=d_ff,
        dropout=dropout,
        lookback=lookback,
        pred_horizon=pred_horizon
    )
    trainer = PolicyTrainer(model=model, learning_rate=learning_rate, device=device)
    training_result = trainer.train(
        data=data, epochs=epochs, batch_size=batch_size, early_stopping_patience=15
    )
    model.eval()
    with torch.no_grad():
        X_test = torch.tensor(data['X_test'], dtype=torch.float32).to(device)
        entity_test = torch.tensor(data['entity_test'], dtype=torch.long).to(device)
        test_predictions, _ = model(X_test, entity_test)
        test_predictions = test_predictions.cpu().numpy()
    model_state = {
        'state_dict': {k: v.cpu().tolist() for k, v in model.state_dict().items()},
        'config': model.get_config(),
        'data_params': processor.get_normalization_params()
    }
    return model_state, training_result, test_predictions


def handle_train(input_data: Dict) -> Dict:
    """Handle training request. Supports useEnsemble for uncertainty (3 models)."""
    csv_data = input_data.get('data')
    data_type = input_data.get('dataType', 'panel')
    entity_col = input_data.get('entityCol')
    time_col = input_data.get('timeCol')
    feature_cols = input_data.get('featureCols', [])
    target_cols = input_data.get('targetCols', [])
    d_model = input_data.get('dModel', 128)
    num_heads = input_data.get('numHeads', 8)
    num_layers = input_data.get('numLayers', 4)
    d_ff = input_data.get('dFf', 512)
    dropout = input_data.get('dropout', 0.1)
    learning_rate = input_data.get('learningRate', 1e-4)
    batch_size = input_data.get('batchSize', 32)
    epochs = input_data.get('epochs', 100)
    lookback = input_data.get('lookback', 5)
    pred_horizon = input_data.get('predHorizon', 1)
    use_ensemble = input_data.get('useEnsemble', False)
    processor = PanelDataProcessor()
    df = processor.load_csv(csv_data)
    data = processor.prepare_data(
        df=df, entity_col=entity_col, time_col=time_col,
        feature_cols=feature_cols, target_cols=target_cols,
        lookback=lookback, pred_horizon=pred_horizon, data_type=data_type
    )
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    if use_ensemble:
        model_states = []
        all_preds = []
        seeds = [42, 123, 456]
        training_result_0 = None
        for i, seed in enumerate(seeds):
            model_state, training_result, test_predictions = _train_single_model(
                input_data, data, processor, device, seed=seed
            )
            model_states.append(model_state)
            all_preds.append(test_predictions)
            if i == 0:
                training_result_0 = training_result
        # Feature importance from first model
        config = model_states[0]['config']
        model0 = PanelTransformer.from_config(config)
        state_dict = {k: torch.tensor(v) for k, v in model_states[0]['state_dict'].items()}
        model0.load_state_dict(state_dict)
        model0.to(device)
        feature_importance = compute_feature_importance(
            model=model0, X=data['X_test'], entity_ids=data['entity_test'],
            feature_names=feature_cols, device=device
        )
        test_predictions = np.stack(all_preds, axis=0)
        pred_mean = np.mean(test_predictions, axis=0)
        pred_std = np.std(test_predictions, axis=0)
        plots = generate_plots(
            history=training_result_0['history'],
            predictions=pred_mean,
            targets=data['y_test'],
            feature_importance=feature_importance
        )
        return {
            'success': True,
            'epochsTrained': training_result_0['epochs_trained'],
            'bestValLoss': training_result_0['best_val_loss'],
            'testMetrics': training_result_0['test_metrics'],
            'featureImportance': feature_importance,
            'history': {
                'trainLoss': training_result_0['history']['train_loss'],
                'valLoss': training_result_0['history']['val_loss']
            },
            'plots': plots,
            'modelState': None,
            'modelStates': model_states,
            'useEnsemble': True,
            'predictionStd': pred_std.tolist()
        }
    # Single model (original)
    model_state, training_result, test_predictions = _train_single_model(
        input_data, data, processor, device, seed=42
    )
    config = model_state['config']
    model = PanelTransformer.from_config(config)
    state_dict = {k: torch.tensor(v) for k, v in model_state['state_dict'].items()}
    model.load_state_dict(state_dict)
    model.to(device)
    feature_importance = compute_feature_importance(
        model=model, X=data['X_test'], entity_ids=data['entity_test'],
        feature_names=feature_cols, device=device
    )
    plots = generate_plots(
        history=training_result['history'],
        predictions=test_predictions,
        targets=data['y_test'],
        feature_importance=feature_importance
    )
    return {
        'success': True,
        'epochsTrained': training_result['epochs_trained'],
        'bestValLoss': training_result['best_val_loss'],
        'testMetrics': training_result['test_metrics'],
        'featureImportance': feature_importance,
        'history': {
            'trainLoss': training_result['history']['train_loss'],
            'valLoss': training_result['history']['val_loss']
        },
        'plots': plots,
        'modelState': model_state
    }


def _load_models_from_state(model_state_or_states) -> Tuple[PanelTransformer, Optional[List[PanelTransformer]]]:
    """Load one model or a list of models from modelState or modelStates."""
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    if isinstance(model_state_or_states, list) and len(model_state_or_states) > 0:
        models = []
        for ms in model_state_or_states:
            config = ms['config']
            m = PanelTransformer.from_config(config)
            state_dict = {k: torch.tensor(v) for k, v in ms['state_dict'].items()}
            m.load_state_dict(state_dict)
            m.to(device)
            m.eval()
            models.append(m)
        return models[0], models
    ms = model_state_or_states
    config = ms['config']
    model = PanelTransformer.from_config(config)
    state_dict = {k: torch.tensor(v) for k, v in ms['state_dict'].items()}
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    return model, None


def handle_optimize(input_data: Dict) -> Dict:
    """Handle optimization request. Supports constraints, sequenceHorizon, and modelStates (ensemble)."""
    model_state = input_data.get('modelState')
    model_states = input_data.get('modelStates')
    if not model_state and not model_states:
        return {'success': False, 'error': 'No model state provided. Train a model first.'}
    state_to_use = model_states if model_states else model_state
    model, models = _load_models_from_state(state_to_use)
    config = (model_states[0] if model_states else model_state)['config']
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    processor = PanelDataProcessor()
    processor.load_normalization_params((model_states[0] if model_states else model_state)['data_params'])
    reward_code = input_data.get('rewardCode', '')
    if not reward_code:
        return {'success': False, 'error': 'No reward function provided.'}
    reward_loader = RewardFunctionLoader()
    try:
        reward_loader.load_from_code(reward_code)
    except Exception as e:
        return {'success': False, 'error': f'Failed to load reward function: {str(e)}'}
    csv_data = input_data.get('data')
    data_type = input_data.get('dataType', 'panel')
    entity_col = input_data.get('entityCol')
    time_col = input_data.get('timeCol')
    feature_cols = input_data.get('featureCols', [])
    target_cols = input_data.get('targetCols', [])
    policy_features = input_data.get('policyFeatures', [])
    bounds_input = input_data.get('bounds', {})
    bounds = []
    for pf in policy_features:
        if pf in bounds_input and isinstance(bounds_input[pf], dict):
            bounds.append((bounds_input[pf].get('min', -1.0), bounds_input[pf].get('max', 1.0)))
        else:
            bounds.append((-1.0, 1.0))
    df = processor.load_csv(csv_data)
    data = processor.prepare_data(
        df=df, entity_col=entity_col, time_col=time_col,
        feature_cols=feature_cols, target_cols=target_cols,
        lookback=config['lookback'], pred_horizon=config['pred_horizon'], data_type=data_type
    )
    method = input_data.get('optimizationMethod', 'differential_evolution')
    max_iterations = input_data.get('maxIterations', 100)
    constraints = input_data.get('constraints', [])  # [ { variable, type: 'max'|'min', value } ]
    sequence_horizon = int(input_data.get('sequenceHorizon', 1))
    optimizer = PolicyOptimizer(
        model=model,
        reward_loader=reward_loader,
        device=device,
        models=models
    )
    if sequence_horizon <= 1:
        result = optimizer.optimize(
            base_features=data['X_test'],
            entity_ids=data['entity_test'],
            policy_feature_names=policy_features,
            feature_names=feature_cols,
            target_names=target_cols,
            bounds=bounds,
            method=method,
            max_iterations=max_iterations,
            constraints=constraints
        )
        return {
            'success': True,
            'optimalParams': result['optimal_params'],
            'optimalReward': result['optimal_reward'],
            'baselinePredictions': result['baseline_predictions'],
            'optimalPredictions': result['optimal_predictions'],
            'improvement': result['improvement'],
            'iterations': result['iterations'],
            'policyPath': None
        }
    # Sequential: run optimization for each period with context
    path = []
    last_result = None
    for t in range(1, sequence_horizon + 1):
        ctx = {'period': t, 'totalPeriods': sequence_horizon}
        last_result = optimizer.optimize(
            base_features=data['X_test'],
            entity_ids=data['entity_test'],
            policy_feature_names=policy_features,
            feature_names=feature_cols,
            target_names=target_cols,
            bounds=bounds,
            method=method,
            max_iterations=max_iterations,
            context=ctx,
            constraints=constraints
        )
        path.append({'period': t, 'optimalParams': last_result['optimal_params']})
    return {
        'success': True,
        'optimalParams': last_result['optimal_params'],
        'optimalReward': last_result['optimal_reward'],
        'baselinePredictions': last_result['baseline_predictions'],
        'optimalPredictions': last_result['optimal_predictions'],
        'improvement': last_result['improvement'],
        'iterations': last_result['iterations'],
        'policyPath': path,
        'sequenceHorizon': sequence_horizon
    }


def handle_predict(input_data: Dict) -> Dict:
    """Handle prediction request. Supports modelStates (ensemble) for mean and std."""
    model_state = input_data.get('modelState')
    model_states = input_data.get('modelStates')
    if not model_state and not model_states:
        return {'success': False, 'error': 'No model state provided.'}
    state_to_use = model_states if model_states else model_state
    model, models = _load_models_from_state(state_to_use)
    config = (model_states[0] if model_states else model_state)['config']
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    processor = PanelDataProcessor()
    processor.load_normalization_params((model_states[0] if model_states else model_state)['data_params'])
    csv_data = input_data.get('data')
    data_type = input_data.get('dataType', (model_states[0] if model_states else model_state)['data_params'].get('data_type', 'panel'))
    entity_col = input_data.get('entityCol')
    time_col = input_data.get('timeCol')
    feature_cols = input_data.get('featureCols', [])
    target_cols = input_data.get('targetCols', [])
    
    df = processor.load_csv(csv_data)
    data = processor.prepare_data(
        df=df,
        entity_col=entity_col,
        time_col=time_col,
        feature_cols=feature_cols,
        target_cols=target_cols,
        lookback=config['lookback'],
        pred_horizon=config['pred_horizon'],
        data_type=data_type
    )
    
    X = torch.tensor(data['X_test'], dtype=torch.float32).to(device)
    entity_ids = torch.tensor(data['entity_test'], dtype=torch.long).to(device)
    if models:
        all_preds = []
        with torch.no_grad():
            for m in models:
                pred, _ = m(X, entity_ids)
                all_preds.append(pred.cpu().numpy())
        predictions = np.mean(all_preds, axis=0)
        predictions_std = np.std(all_preds, axis=0)
        predictions_denorm = processor.denormalize_predictions(predictions)
        return {
            'success': True,
            'predictions': predictions_denorm.tolist(),
            'targetNames': target_cols,
            'predictionStd': predictions_std.tolist()
        }
    with torch.no_grad():
        predictions, _ = model(X, entity_ids, return_attention=True)
        predictions = predictions.cpu().numpy()
    predictions_denorm = processor.denormalize_predictions(predictions)
    return {
        'success': True,
        'predictions': predictions_denorm.tolist(),
        'targetNames': target_cols
    }


def handle_scenario_analysis(input_data: Dict) -> Dict:
    """Handle scenario analysis request."""
    model_state = input_data.get('modelState')
    if not model_state:
        return {'success': False, 'error': 'No model state provided.'}
    
    # Load reward function
    reward_code = input_data.get('rewardCode', '')
    reward_loader = RewardFunctionLoader()
    if reward_code:
        try:
            reward_loader.load_from_code(reward_code)
        except:
            pass
    
    # Recreate model
    config = model_state['config']
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    
    model = PanelTransformer.from_config(config)
    state_dict = {}
    for k, v in model_state['state_dict'].items():
        state_dict[k] = torch.tensor(v)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    
    # Load data
    processor = PanelDataProcessor()
    processor.load_normalization_params(model_state['data_params'])
    
    csv_data = input_data.get('data')
    data_type = input_data.get('dataType', model_state['data_params'].get('data_type', 'panel'))
    entity_col = input_data.get('entityCol')
    time_col = input_data.get('timeCol')
    feature_cols = input_data.get('featureCols', [])
    target_cols = input_data.get('targetCols', [])
    scenarios = input_data.get('scenarios', {})
    
    df = processor.load_csv(csv_data)
    data = processor.prepare_data(
        df=df,
        entity_col=entity_col,
        time_col=time_col,
        feature_cols=feature_cols,
        target_cols=target_cols,
        lookback=config['lookback'],
        pred_horizon=config['pred_horizon'],
        data_type=data_type
    )
    
    # Create optimizer for scenario analysis
    optimizer = PolicyOptimizer(
        model=model,
        reward_loader=reward_loader,
        device=device
    )
    
    result = optimizer.scenario_analysis(
        base_features=data['X_test'],
        entity_ids=data['entity_test'],
        scenarios=scenarios,
        feature_names=feature_cols,
        target_names=target_cols
    )
    
    return {
        'success': True,
        'scenarios': result
    }


def main():
    """Main entry point."""
    try:
        # Read input from stdin
        input_str = sys.stdin.read()
        input_data = json.loads(input_str)
        
        action = input_data.get('action', 'train')
        
        if action == 'train':
            result = handle_train(input_data)
        elif action == 'optimize':
            result = handle_optimize(input_data)
        elif action == 'predict':
            result = handle_predict(input_data)
        elif action == 'scenario':
            result = handle_scenario_analysis(input_data)
        else:
            result = {'success': False, 'error': f'Unknown action: {action}'}
        
        # Output result
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        print(json.dumps(error_result))


if __name__ == '__main__':
    main()
