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
from typing import Dict, Any

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


def handle_train(input_data: Dict) -> Dict:
    """Handle training request."""
    # Extract parameters
    csv_data = input_data.get('data')
    data_type = input_data.get('dataType', 'panel')  # 'panel' or 'cross_section'
    entity_col = input_data.get('entityCol')
    time_col = input_data.get('timeCol')
    feature_cols = input_data.get('featureCols', [])
    target_cols = input_data.get('targetCols', [])
    
    # Model parameters
    d_model = input_data.get('dModel', 128)
    num_heads = input_data.get('numHeads', 8)
    num_layers = input_data.get('numLayers', 4)
    d_ff = input_data.get('dFf', 512)
    dropout = input_data.get('dropout', 0.1)
    
    # Training parameters
    learning_rate = input_data.get('learningRate', 1e-4)
    batch_size = input_data.get('batchSize', 32)
    epochs = input_data.get('epochs', 100)
    lookback = input_data.get('lookback', 5)
    pred_horizon = input_data.get('predHorizon', 1)
    
    # Process data
    processor = PanelDataProcessor()
    df = processor.load_csv(csv_data)
    
    data = processor.prepare_data(
        df=df,
        entity_col=entity_col,
        time_col=time_col,
        feature_cols=feature_cols,
        target_cols=target_cols,
        lookback=lookback,
        pred_horizon=pred_horizon,
        data_type=data_type
    )
    
    # Create model
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    
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
    
    # Create trainer
    trainer = PolicyTrainer(
        model=model,
        learning_rate=learning_rate,
        device=device
    )
    
    # Train
    training_result = trainer.train(
        data=data,
        epochs=epochs,
        batch_size=batch_size,
        early_stopping_patience=15
    )
    
    # Compute feature importance
    feature_importance = compute_feature_importance(
        model=model,
        X=data['X_test'],
        entity_ids=data['entity_test'],
        feature_names=feature_cols,
        device=device
    )
    
    # Get test predictions for plotting
    model.eval()
    with torch.no_grad():
        X_test = torch.tensor(data['X_test'], dtype=torch.float32).to(device)
        entity_test = torch.tensor(data['entity_test'], dtype=torch.long).to(device)
        test_predictions, _ = model(X_test, entity_test)
        test_predictions = test_predictions.cpu().numpy()
    
    # Generate plots
    plots = generate_plots(
        history=training_result['history'],
        predictions=test_predictions,
        targets=data['y_test'],
        feature_importance=feature_importance
    )
    
    # Save model state for later use
    model_state = {
        'state_dict': {k: v.cpu().tolist() for k, v in model.state_dict().items()},
        'config': model.get_config(),
        'data_params': processor.get_normalization_params()
    }
    
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


def handle_optimize(input_data: Dict) -> Dict:
    """Handle optimization request."""
    # Load model state
    model_state = input_data.get('modelState')
    if not model_state:
        return {'success': False, 'error': 'No model state provided. Train a model first.'}
    
    # Recreate model
    config = model_state['config']
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    
    model = PanelTransformer.from_config(config)
    
    # Load weights
    state_dict = {}
    for k, v in model_state['state_dict'].items():
        state_dict[k] = torch.tensor(v)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    
    # Load data processor params
    processor = PanelDataProcessor()
    processor.load_normalization_params(model_state['data_params'])
    
    # Load reward function
    reward_code = input_data.get('rewardCode', '')
    if not reward_code:
        return {'success': False, 'error': 'No reward function provided.'}
    
    reward_loader = RewardFunctionLoader()
    try:
        reward_loader.load_from_code(reward_code)
    except Exception as e:
        return {'success': False, 'error': f'Failed to load reward function: {str(e)}'}
    
    # Get optimization parameters
    csv_data = input_data.get('data')
    data_type = input_data.get('dataType', 'panel')
    entity_col = input_data.get('entityCol')
    time_col = input_data.get('timeCol')
    feature_cols = input_data.get('featureCols', [])
    target_cols = input_data.get('targetCols', [])
    policy_features = input_data.get('policyFeatures', [])
    
    # Bounds for policy parameters
    bounds_input = input_data.get('bounds', {})
    bounds = []
    for pf in policy_features:
        if pf in bounds_input:
            bounds.append((bounds_input[pf]['min'], bounds_input[pf]['max']))
        else:
            bounds.append((-1.0, 1.0))  # Default normalized bounds
    
    # Prepare data
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
    
    # Create optimizer
    method = input_data.get('optimizationMethod', 'differential_evolution')
    max_iterations = input_data.get('maxIterations', 100)
    
    optimizer = PolicyOptimizer(
        model=model,
        reward_loader=reward_loader,
        device=device
    )
    
    # Run optimization
    result = optimizer.optimize(
        base_features=data['X_test'],
        entity_ids=data['entity_test'],
        policy_feature_names=policy_features,
        feature_names=feature_cols,
        target_names=target_cols,
        bounds=bounds,
        method=method,
        max_iterations=max_iterations
    )
    
    return {
        'success': True,
        'optimalParams': result['optimal_params'],
        'optimalReward': result['optimal_reward'],
        'baselinePredictions': result['baseline_predictions'],
        'optimalPredictions': result['optimal_predictions'],
        'improvement': result['improvement'],
        'iterations': result['iterations']
    }


def handle_predict(input_data: Dict) -> Dict:
    """Handle prediction request."""
    model_state = input_data.get('modelState')
    if not model_state:
        return {'success': False, 'error': 'No model state provided.'}
    
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
    
    # Predict
    with torch.no_grad():
        X = torch.tensor(data['X_test'], dtype=torch.float32).to(device)
        entity_ids = torch.tensor(data['entity_test'], dtype=torch.long).to(device)
        predictions, attention = model(X, entity_ids, return_attention=True)
        predictions = predictions.cpu().numpy()
    
    # Denormalize predictions
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
