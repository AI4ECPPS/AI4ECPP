"""
Policy Optimizer
Finds optimal policy parameters that maximize a custom reward function.
Uses gradient-based optimization and evolutionary strategies.
"""

import torch
import numpy as np
from typing import Dict, List, Optional, Callable, Tuple
import importlib.util
import sys
from scipy.optimize import minimize, differential_evolution
import warnings

from model import PanelTransformer


class RewardFunctionLoader:
    """
    Safely load and execute user-defined reward functions.
    """
    
    def __init__(self):
        self.reward_func = None
        self.allowed_modules = ['numpy', 'math', 'scipy.special']
    
    def load_from_code(self, code_string: str) -> Callable:
        """
        Load reward function from Python code string.
        
        Expected format:
        ```python
        def compute_reward(predictions, actual, context):
            # Your reward logic here
            return reward_value
        ```
        """
        # Create a restricted namespace
        namespace = {
            'np': np,
            'numpy': np,
            'math': __import__('math'),
            '__builtins__': {
                'abs': abs, 'min': min, 'max': max, 'sum': sum,
                'len': len, 'range': range, 'float': float, 'int': int,
                'list': list, 'dict': dict, 'tuple': tuple,
                'True': True, 'False': False, 'None': None,
                'pow': pow, 'round': round
            }
        }
        
        try:
            exec(code_string, namespace)
            
            if 'compute_reward' not in namespace:
                raise ValueError("Code must define a 'compute_reward' function")
            
            self.reward_func = namespace['compute_reward']
            return self.reward_func
            
        except Exception as e:
            raise ValueError(f"Failed to load reward function: {str(e)}")
    
    def load_from_file(self, file_path: str) -> Callable:
        """Load reward function from a Python file."""
        with open(file_path, 'r') as f:
            code = f.read()
        return self.load_from_code(code)
    
    def compute(self, predictions: Dict, actual: Optional[Dict] = None, 
                context: Optional[Dict] = None) -> float:
        """Execute the reward function."""
        if self.reward_func is None:
            raise ValueError("No reward function loaded")
        
        try:
            reward = self.reward_func(predictions, actual or {}, context or {})
            return float(reward)
        except Exception as e:
            warnings.warn(f"Reward computation failed: {str(e)}")
            return float('-inf')


class PolicyOptimizer:
    """
    Optimizer for finding optimal policy parameters.
    Uses the trained Transformer model(s) to predict outcomes and
    optimizes policy parameters to maximize the reward function.
    If models (list) is provided, predictions are averaged for uncertainty-aware optimization.
    """
    
    def __init__(
        self,
        model: PanelTransformer,
        reward_loader: RewardFunctionLoader,
        device: str = 'cpu',
        models: Optional[List[PanelTransformer]] = None
    ):
        self.model = model
        self.model.to(device)
        self.model.eval()
        self.models = models  # Optional list for ensemble (predictions averaged)
        if self.models:
            for m in self.models:
                m.to(device)
                m.eval()
        self.device = device
        self.reward_loader = reward_loader
        self.optimization_history = []
    
    def _predict_with_params(
        self,
        base_features: np.ndarray,
        entity_ids: np.ndarray,
        policy_params: np.ndarray,
        policy_feature_indices: List[int],
        target_names: List[str]
    ) -> Dict[str, np.ndarray]:
        """
        Make predictions with modified policy parameters.
        If self.models is set, averages predictions over all models (ensemble).
        """
        modified_features = base_features.copy()
        for i, idx in enumerate(policy_feature_indices):
            if i < len(policy_params):
                modified_features[:, -1, idx] = policy_params[i]
        X = torch.tensor(modified_features, dtype=torch.float32).to(self.device)
        entity_tensor = torch.tensor(entity_ids, dtype=torch.long).to(self.device)
        if self.models:
            all_preds = []
            with torch.no_grad():
                for m in self.models:
                    pred, _ = m(X, entity_tensor)
                    all_preds.append(pred.cpu().numpy())
            predictions = np.mean(all_preds, axis=0)
        else:
            with torch.no_grad():
                predictions, _ = self.model(X, entity_tensor)
                predictions = predictions.cpu().numpy()
        result = {}
        for i, name in enumerate(target_names):
            if i < predictions.shape[-1]:
                result[name] = float(predictions[:, :, i].mean())
        return result
    
    def _objective_function(
        self,
        policy_params: np.ndarray,
        base_features: np.ndarray,
        entity_ids: np.ndarray,
        policy_feature_indices: List[int],
        target_names: List[str],
        context: Dict,
        constraints: Optional[List[Dict]] = None
    ) -> float:
        """Objective function for optimization (negative reward for minimization)."""
        predictions = self._predict_with_params(
            base_features, entity_ids, policy_params,
            policy_feature_indices, target_names
        )
        reward = self.reward_loader.compute(predictions, None, context)
        try:
            reward = float(reward)
        except (TypeError, ValueError):
            reward = float(reward) if hasattr(reward, '__float__') else 0.0
        # Apply constraint penalties: each constraint { variable, type: 'max'|'min', value }
        if constraints:
            for c in constraints:
                var = c.get('variable')
                typ = c.get('type', 'max')
                val = c.get('value')
                if var not in predictions or val is None:
                    continue
                pv = predictions[var]
                if typ == 'max' and pv > val:
                    reward -= 1000.0 * (pv - val)
                elif typ == 'min' and pv < val:
                    reward -= 1000.0 * (val - pv)
        self.optimization_history.append({
            'params': policy_params.tolist(),
            'predictions': {k: float(v) for k, v in predictions.items()},
            'reward': float(reward)
        })
        return -reward  # Negative because we minimize
    
    def optimize(
        self,
        base_features: np.ndarray,
        entity_ids: np.ndarray,
        policy_feature_names: List[str],
        feature_names: List[str],
        target_names: List[str],
        bounds: List[Tuple[float, float]],
        initial_params: Optional[np.ndarray] = None,
        method: str = 'differential_evolution',
        max_iterations: int = 100,
        context: Optional[Dict] = None,
        constraints: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Find optimal policy parameters.
        
        Args:
            base_features: Base feature data
            entity_ids: Entity IDs
            policy_feature_names: Names of features that represent policy parameters
            feature_names: All feature names
            target_names: Target variable names
            bounds: List of (min, max) tuples for each policy parameter
            initial_params: Initial parameter values
            method: Optimization method ('differential_evolution', 'L-BFGS-B', 'SLSQP')
            max_iterations: Maximum optimization iterations
            context: Additional context for reward function
            
        Returns:
            Optimization results
        """
        self.optimization_history = []
        
        # Get indices of policy features
        policy_feature_indices = []
        for name in policy_feature_names:
            if name in feature_names:
                policy_feature_indices.append(feature_names.index(name))
        
        if not policy_feature_indices:
            raise ValueError("No valid policy features found")
        
        context = context or {}
        n_params = len(policy_feature_indices)
        
        # Ensure bounds match number of parameters
        if len(bounds) != n_params:
            bounds = [(0, 1)] * n_params
        
        # Initialize
        if initial_params is None:
            initial_params = np.array([(b[0] + b[1]) / 2 for b in bounds])
        
        constraints = constraints or []
        if method == 'differential_evolution':
            result = differential_evolution(
                func=lambda p: self._objective_function(
                    p, base_features, entity_ids, policy_feature_indices, target_names,
                    context or {}, constraints
                ),
                bounds=bounds,
                maxiter=max_iterations,
                seed=42,
                workers=1,
                polish=True
            )
            optimal_params = result.x
            optimal_reward = -result.fun
            success = result.success
        else:
            result = minimize(
                fun=lambda p: self._objective_function(
                    p, base_features, entity_ids, policy_feature_indices, target_names,
                    context or {}, constraints
                ),
                x0=initial_params,
                method=method,
                bounds=bounds,
                options={'maxiter': max_iterations}
            )
            optimal_params = result.x
            optimal_reward = -result.fun
            success = result.success
        
        # Get final predictions
        final_predictions = self._predict_with_params(
            base_features, entity_ids, optimal_params,
            policy_feature_indices, target_names
        )
        
        # Get baseline predictions (without policy changes)
        baseline_predictions = self._predict_with_params(
            base_features, entity_ids, 
            base_features[:, -1, policy_feature_indices].mean(axis=0),
            policy_feature_indices, target_names
        )
        
        return {
            'optimal_params': {name: float(optimal_params[i]) 
                             for i, name in enumerate(policy_feature_names)},
            'optimal_reward': float(optimal_reward),
            'baseline_predictions': {k: float(v) for k, v in baseline_predictions.items()},
            'optimal_predictions': {k: float(v) for k, v in final_predictions.items()},
            'improvement': {k: float(final_predictions[k] - baseline_predictions[k]) 
                          for k in final_predictions},
            'success': success,
            'iterations': len(self.optimization_history),
            'history': self.optimization_history[-100:]  # Last 100 iterations
        }
    
    def scenario_analysis(
        self,
        base_features: np.ndarray,
        entity_ids: np.ndarray,
        scenarios: Dict[str, Dict[str, float]],
        feature_names: List[str],
        target_names: List[str]
    ) -> Dict:
        """
        Analyze multiple policy scenarios.
        
        Args:
            base_features: Base feature data
            entity_ids: Entity IDs
            scenarios: Dict mapping scenario names to feature modifications
            feature_names: All feature names
            target_names: Target variable names
            
        Returns:
            Analysis results for each scenario
        """
        results = {}
        
        for scenario_name, modifications in scenarios.items():
            modified_features = base_features.copy()
            
            for feature_name, value in modifications.items():
                if feature_name in feature_names:
                    idx = feature_names.index(feature_name)
                    modified_features[:, -1, idx] = value
            
            # Predict
            X = torch.tensor(modified_features, dtype=torch.float32).to(self.device)
            entity_tensor = torch.tensor(entity_ids, dtype=torch.long).to(self.device)
            
            with torch.no_grad():
                predictions, attention = self.model(X, entity_tensor, return_attention=True)
                predictions = predictions.cpu().numpy()
            
            # Format predictions
            scenario_predictions = {}
            for i, name in enumerate(target_names):
                if i < predictions.shape[-1]:
                    scenario_predictions[name] = {
                        'mean': float(predictions[:, :, i].mean()),
                        'std': float(predictions[:, :, i].std()),
                        'min': float(predictions[:, :, i].min()),
                        'max': float(predictions[:, :, i].max())
                    }
            
            # Compute reward
            pred_means = {k: v['mean'] for k, v in scenario_predictions.items()}
            reward = self.reward_loader.compute(pred_means, None, {})
            
            results[scenario_name] = {
                'modifications': modifications,
                'predictions': scenario_predictions,
                'reward': float(reward)
            }
        
        return results


class EvolutionaryOptimizer:
    """
    Alternative optimizer using evolutionary strategies.
    Better for non-differentiable reward functions.
    """
    
    def __init__(
        self,
        model: PanelTransformer,
        reward_loader: RewardFunctionLoader,
        population_size: int = 50,
        device: str = 'cpu'
    ):
        self.model = model
        self.model.to(device)
        self.model.eval()
        self.device = device
        self.reward_loader = reward_loader
        self.population_size = population_size
    
    def optimize(
        self,
        base_features: np.ndarray,
        entity_ids: np.ndarray,
        policy_feature_indices: List[int],
        target_names: List[str],
        bounds: List[Tuple[float, float]],
        generations: int = 50,
        mutation_rate: float = 0.1,
        crossover_rate: float = 0.7,
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Evolutionary optimization.
        
        Uses a genetic algorithm approach:
        1. Initialize population
        2. Evaluate fitness (reward)
        3. Select best individuals
        4. Crossover and mutation
        5. Repeat
        """
        n_params = len(policy_feature_indices)
        context = context or {}
        
        # Initialize population
        population = np.random.uniform(
            low=[b[0] for b in bounds],
            high=[b[1] for b in bounds],
            size=(self.population_size, n_params)
        )
        
        best_individual = None
        best_fitness = float('-inf')
        history = []
        
        for gen in range(generations):
            # Evaluate fitness
            fitness_scores = []
            for individual in population:
                fitness = self._evaluate_fitness(
                    individual, base_features, entity_ids,
                    policy_feature_indices, target_names, context
                )
                fitness_scores.append(fitness)
            
            fitness_scores = np.array(fitness_scores)
            
            # Track best
            gen_best_idx = np.argmax(fitness_scores)
            if fitness_scores[gen_best_idx] > best_fitness:
                best_fitness = fitness_scores[gen_best_idx]
                best_individual = population[gen_best_idx].copy()
            
            history.append({
                'generation': gen,
                'best_fitness': float(best_fitness),
                'avg_fitness': float(np.mean(fitness_scores)),
                'std_fitness': float(np.std(fitness_scores))
            })
            
            # Selection (tournament)
            new_population = []
            for _ in range(self.population_size):
                # Tournament selection
                idx1, idx2 = np.random.choice(self.population_size, 2, replace=False)
                winner_idx = idx1 if fitness_scores[idx1] > fitness_scores[idx2] else idx2
                new_population.append(population[winner_idx].copy())
            
            population = np.array(new_population)
            
            # Crossover
            for i in range(0, self.population_size - 1, 2):
                if np.random.random() < crossover_rate:
                    # Single point crossover
                    point = np.random.randint(1, n_params)
                    population[i, point:], population[i+1, point:] = \
                        population[i+1, point:].copy(), population[i, point:].copy()
            
            # Mutation
            for i in range(self.population_size):
                for j in range(n_params):
                    if np.random.random() < mutation_rate:
                        population[i, j] = np.random.uniform(bounds[j][0], bounds[j][1])
            
            # Elitism: keep best individual
            population[0] = best_individual
        
        return {
            'optimal_params': best_individual.tolist(),
            'optimal_fitness': float(best_fitness),
            'generations': generations,
            'history': history
        }
    
    def _evaluate_fitness(
        self,
        params: np.ndarray,
        base_features: np.ndarray,
        entity_ids: np.ndarray,
        policy_feature_indices: List[int],
        target_names: List[str],
        context: Dict
    ) -> float:
        """Evaluate fitness of an individual."""
        # Modify features
        modified_features = base_features.copy()
        for i, idx in enumerate(policy_feature_indices):
            modified_features[:, -1, idx] = params[i]
        
        # Predict
        X = torch.tensor(modified_features, dtype=torch.float32).to(self.device)
        entity_tensor = torch.tensor(entity_ids, dtype=torch.long).to(self.device)
        
        with torch.no_grad():
            predictions, _ = self.model(X, entity_tensor)
            predictions = predictions.cpu().numpy()
        
        # Format predictions
        pred_dict = {}
        for i, name in enumerate(target_names):
            if i < predictions.shape[-1]:
                pred_dict[name] = predictions[:, :, i].mean()
        
        # Compute reward
        return self.reward_loader.compute(pred_dict, None, context)
