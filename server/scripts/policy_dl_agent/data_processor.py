"""
Data Processor for Panel Data
Handles loading, preprocessing, and batching of panel data for the Transformer model.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
import json
from io import StringIO


class PanelDataProcessor:
    """Process panel data or cross-sectional data for deep learning model training."""
    
    def __init__(self):
        self.entity_encoder = {}
        self.entity_decoder = {}
        self.feature_means = None
        self.feature_stds = None
        self.target_means = None
        self.target_stds = None
        self.feature_names = []
        self.target_names = []
        self.data_type = 'panel'  # 'panel' or 'cross_section'
        
    def load_csv(self, csv_string: str) -> pd.DataFrame:
        """Load CSV data from string."""
        return pd.read_csv(StringIO(csv_string))
    
    def prepare_data(
        self,
        df: pd.DataFrame,
        entity_col: str,
        time_col: str,
        feature_cols: List[str],
        target_cols: List[str],
        lookback: int = 5,
        pred_horizon: int = 1,
        data_type: str = 'panel'
    ) -> Dict:
        """
        Prepare panel data or cross-sectional data for model training.
        
        Args:
            df: DataFrame with data
            entity_col: Column name for entity identifier (optional for cross-section)
            time_col: Column name for time identifier (only for panel data)
            feature_cols: List of feature column names
            target_cols: List of target column names
            lookback: Number of historical time steps to use (only for panel)
            pred_horizon: Number of future time steps to predict (only for panel)
            data_type: 'panel' or 'cross_section'
            
        Returns:
            Dictionary with processed data and metadata
        """
        self.feature_names = feature_cols
        self.target_names = target_cols
        self.data_type = data_type
        
        if data_type == 'cross_section':
            return self._prepare_cross_section_data(df, entity_col, feature_cols, target_cols)
        else:
            return self._prepare_panel_data(df, entity_col, time_col, feature_cols, target_cols, lookback, pred_horizon)
    
    def _prepare_cross_section_data(
        self,
        df: pd.DataFrame,
        id_col: Optional[str],
        feature_cols: List[str],
        target_cols: List[str]
    ) -> Dict:
        """Prepare cross-sectional data for MLP/simple model training."""
        
        # Extract features and targets
        features = df[feature_cols].values.astype(np.float32)
        targets = df[target_cols].values.astype(np.float32)
        
        # Handle missing values
        features = np.nan_to_num(features, nan=0.0)
        targets = np.nan_to_num(targets, nan=0.0)
        
        # Normalize features
        self.feature_means = np.mean(features, axis=0)
        self.feature_stds = np.std(features, axis=0) + 1e-8
        features_normalized = (features - self.feature_means) / self.feature_stds
        
        # Normalize targets
        self.target_means = np.mean(targets, axis=0)
        self.target_stds = np.std(targets, axis=0) + 1e-8
        targets_normalized = (targets - self.target_means) / self.target_stds
        
        # For cross-section: X shape is [n_samples, 1, n_features] (fake time dimension)
        X = features_normalized[:, np.newaxis, :]  # Add fake time dimension
        y = targets_normalized[:, np.newaxis, :]   # Add fake horizon dimension
        
        # Create entity IDs (all same for cross-section)
        n_samples = len(X)
        entity_ids = np.zeros(n_samples, dtype=np.int64)
        self.entity_encoder = {'all': 0}
        self.entity_decoder = {0: 'all'}
        
        # Train/val/test split (70/15/15)
        train_idx = int(n_samples * 0.7)
        val_idx = int(n_samples * 0.85)
        
        # Shuffle indices
        indices = np.random.permutation(n_samples)
        
        return {
            'X_train': X[indices[:train_idx]],
            'y_train': y[indices[:train_idx]],
            'entity_train': entity_ids[indices[:train_idx]],
            'X_val': X[indices[train_idx:val_idx]],
            'y_val': y[indices[train_idx:val_idx]],
            'entity_val': entity_ids[indices[train_idx:val_idx]],
            'X_test': X[indices[val_idx:]],
            'y_test': y[indices[val_idx:]],
            'entity_test': entity_ids[indices[val_idx:]],
            'n_entities': 1,
            'n_features': len(feature_cols),
            'n_targets': len(target_cols),
            'lookback': 1,
            'pred_horizon': 1,
            'feature_names': feature_cols,
            'target_names': target_cols,
            'data_type': 'cross_section'
        }
    
    def _prepare_panel_data(
        self,
        df: pd.DataFrame,
        entity_col: str,
        time_col: str,
        feature_cols: List[str],
        target_cols: List[str],
        lookback: int,
        pred_horizon: int
    ) -> Dict:
        """Prepare panel data for Transformer training."""
        
        # Sort by entity and time
        df = df.sort_values([entity_col, time_col]).reset_index(drop=True)
        
        # Encode entities
        entities = df[entity_col].unique()
        self.entity_encoder = {e: i for i, e in enumerate(entities)}
        self.entity_decoder = {i: e for e, i in self.entity_encoder.items()}
        
        # Extract features and targets
        features = df[feature_cols].values.astype(np.float32)
        targets = df[target_cols].values.astype(np.float32)
        
        # Handle missing values
        features = np.nan_to_num(features, nan=0.0)
        targets = np.nan_to_num(targets, nan=0.0)
        
        # Normalize features
        self.feature_means = np.mean(features, axis=0)
        self.feature_stds = np.std(features, axis=0) + 1e-8
        features_normalized = (features - self.feature_means) / self.feature_stds
        
        # Normalize targets
        self.target_means = np.mean(targets, axis=0)
        self.target_stds = np.std(targets, axis=0) + 1e-8
        targets_normalized = (targets - self.target_means) / self.target_stds
        
        # Create sequences for each entity
        X_list, y_list, entity_ids = [], [], []
        
        for entity in entities:
            entity_mask = df[entity_col] == entity
            entity_features = features_normalized[entity_mask]
            entity_targets = targets_normalized[entity_mask]
            
            n_samples = len(entity_features)
            
            # Create sliding windows
            for i in range(lookback, n_samples - pred_horizon + 1):
                X_list.append(entity_features[i-lookback:i])
                y_list.append(entity_targets[i:i+pred_horizon])
                entity_ids.append(self.entity_encoder[entity])
        
        X = np.array(X_list, dtype=np.float32)
        y = np.array(y_list, dtype=np.float32)
        entity_ids = np.array(entity_ids, dtype=np.int64)
        
        # Train/val/test split (70/15/15)
        n = len(X)
        train_idx = int(n * 0.7)
        val_idx = int(n * 0.85)
        
        # Shuffle indices
        indices = np.random.permutation(n)
        
        return {
            'X_train': X[indices[:train_idx]],
            'y_train': y[indices[:train_idx]],
            'entity_train': entity_ids[indices[:train_idx]],
            'X_val': X[indices[train_idx:val_idx]],
            'y_val': y[indices[train_idx:val_idx]],
            'entity_val': entity_ids[indices[train_idx:val_idx]],
            'X_test': X[indices[val_idx:]],
            'y_test': y[indices[val_idx:]],
            'entity_test': entity_ids[indices[val_idx:]],
            'n_entities': len(entities),
            'n_features': len(feature_cols),
            'n_targets': len(target_cols),
            'lookback': lookback,
            'pred_horizon': pred_horizon,
            'feature_names': feature_cols,
            'target_names': target_cols,
            'data_type': 'panel'
        }
    
    def denormalize_predictions(self, predictions: np.ndarray) -> np.ndarray:
        """Convert normalized predictions back to original scale."""
        return predictions * self.target_stds + self.target_means
    
    def denormalize_features(self, features: np.ndarray) -> np.ndarray:
        """Convert normalized features back to original scale."""
        return features * self.feature_stds + self.feature_means
    
    def get_normalization_params(self) -> Dict:
        """Get normalization parameters for saving."""
        return {
            'feature_means': self.feature_means.tolist() if self.feature_means is not None else None,
            'feature_stds': self.feature_stds.tolist() if self.feature_stds is not None else None,
            'target_means': self.target_means.tolist() if self.target_means is not None else None,
            'target_stds': self.target_stds.tolist() if self.target_stds is not None else None,
            'entity_encoder': self.entity_encoder,
            'feature_names': self.feature_names,
            'target_names': self.target_names,
            'data_type': self.data_type
        }
    
    def load_normalization_params(self, params: Dict):
        """Load normalization parameters."""
        self.feature_means = np.array(params['feature_means']) if params['feature_means'] else None
        self.feature_stds = np.array(params['feature_stds']) if params['feature_stds'] else None
        self.target_means = np.array(params['target_means']) if params['target_means'] else None
        self.target_stds = np.array(params['target_stds']) if params['target_stds'] else None
        self.entity_encoder = params.get('entity_encoder', {})
        self.entity_decoder = {v: k for k, v in self.entity_encoder.items()}
        self.feature_names = params.get('feature_names', [])
        self.target_names = params.get('target_names', [])
        self.data_type = params.get('data_type', 'panel')


def create_batches(X: np.ndarray, y: np.ndarray, entity_ids: np.ndarray, 
                   batch_size: int) -> List[Tuple[np.ndarray, np.ndarray, np.ndarray]]:
    """Create batches for training."""
    n = len(X)
    indices = np.random.permutation(n)
    batches = []
    
    for i in range(0, n, batch_size):
        batch_idx = indices[i:i+batch_size]
        batches.append((X[batch_idx], y[batch_idx], entity_ids[batch_idx]))
    
    return batches
