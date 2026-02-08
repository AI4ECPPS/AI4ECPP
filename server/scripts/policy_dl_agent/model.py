"""
Panel Data Transformer Model
A Transformer architecture designed for panel data with temporal and cross-entity attention.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import Optional, Tuple


class PositionalEncoding(nn.Module):
    """Sinusoidal positional encoding for temporal sequences."""
    
    def __init__(self, d_model: int, max_len: int = 500, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)
        
        position = torch.arange(max_len).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2) * (-math.log(10000.0) / d_model))
        
        pe = torch.zeros(max_len, d_model)
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        
        self.register_buffer('pe', pe.unsqueeze(0))
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Tensor of shape [batch, seq_len, d_model]
        """
        x = x + self.pe[:, :x.size(1)]
        return self.dropout(x)


class MultiHeadAttention(nn.Module):
    """Multi-head self-attention mechanism."""
    
    def __init__(self, d_model: int, num_heads: int, dropout: float = 0.1):
        super().__init__()
        assert d_model % num_heads == 0
        
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads
        
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)
        
        self.dropout = nn.Dropout(p=dropout)
    
    def forward(self, query: torch.Tensor, key: torch.Tensor, value: torch.Tensor,
                mask: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        batch_size = query.size(0)
        
        # Linear projections
        Q = self.W_q(query).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        K = self.W_k(key).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        V = self.W_v(value).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        
        # Attention scores
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.d_k)
        
        if mask is not None:
            scores = scores.masked_fill(mask == 0, -1e9)
        
        attn_weights = F.softmax(scores, dim=-1)
        attn_weights = self.dropout(attn_weights)
        
        # Apply attention to values
        context = torch.matmul(attn_weights, V)
        
        # Concatenate heads
        context = context.transpose(1, 2).contiguous().view(batch_size, -1, self.d_model)
        output = self.W_o(context)
        
        return output, attn_weights


class FeedForward(nn.Module):
    """Position-wise feed-forward network."""
    
    def __init__(self, d_model: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(p=dropout)
    
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.linear2(self.dropout(F.gelu(self.linear1(x))))


class TransformerEncoderLayer(nn.Module):
    """Single transformer encoder layer with self-attention and feed-forward."""
    
    def __init__(self, d_model: int, num_heads: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        
        self.self_attn = MultiHeadAttention(d_model, num_heads, dropout)
        self.feed_forward = FeedForward(d_model, d_ff, dropout)
        
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        
        self.dropout1 = nn.Dropout(p=dropout)
        self.dropout2 = nn.Dropout(p=dropout)
    
    def forward(self, x: torch.Tensor, mask: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        # Self-attention with residual connection
        attn_output, attn_weights = self.self_attn(x, x, x, mask)
        x = self.norm1(x + self.dropout1(attn_output))
        
        # Feed-forward with residual connection
        ff_output = self.feed_forward(x)
        x = self.norm2(x + self.dropout2(ff_output))
        
        return x, attn_weights


class PanelTransformer(nn.Module):
    """
    Transformer model for panel data prediction.
    
    Handles multi-entity time series data with:
    - Temporal positional encoding
    - Entity embeddings
    - Multi-head self-attention across time steps
    - Cross-entity attention for capturing correlations
    """
    
    def __init__(
        self,
        n_features: int,
        n_targets: int,
        n_entities: int,
        d_model: int = 128,
        num_heads: int = 8,
        num_layers: int = 4,
        d_ff: int = 512,
        dropout: float = 0.1,
        lookback: int = 5,
        pred_horizon: int = 1
    ):
        super().__init__()
        
        self.n_features = n_features
        self.n_targets = n_targets
        self.n_entities = n_entities
        self.d_model = d_model
        self.lookback = lookback
        self.pred_horizon = pred_horizon
        
        # Input projection
        self.input_projection = nn.Linear(n_features, d_model)
        
        # Entity embedding
        self.entity_embedding = nn.Embedding(n_entities, d_model)
        
        # Positional encoding
        self.pos_encoding = PositionalEncoding(d_model, max_len=lookback + pred_horizon, dropout=dropout)
        
        # Transformer encoder layers
        self.encoder_layers = nn.ModuleList([
            TransformerEncoderLayer(d_model, num_heads, d_ff, dropout)
            for _ in range(num_layers)
        ])
        
        # Output projection
        self.output_projection = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, n_targets * pred_horizon)
        )
        
        # Initialize weights
        self._init_weights()
    
    def _init_weights(self):
        """Initialize model weights."""
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)
    
    def forward(
        self, 
        x: torch.Tensor, 
        entity_ids: torch.Tensor,
        return_attention: bool = False
    ) -> Tuple[torch.Tensor, Optional[torch.Tensor]]:
        """
        Forward pass.
        
        Args:
            x: Input tensor of shape [batch, lookback, n_features]
            entity_ids: Entity IDs of shape [batch]
            return_attention: Whether to return attention weights
            
        Returns:
            predictions: Tensor of shape [batch, pred_horizon, n_targets]
            attention_weights: Optional attention weights
        """
        batch_size, seq_len, _ = x.shape
        
        # Project input to d_model dimensions
        x = self.input_projection(x)  # [batch, lookback, d_model]
        
        # Add entity embedding
        entity_emb = self.entity_embedding(entity_ids)  # [batch, d_model]
        x = x + entity_emb.unsqueeze(1)  # Broadcast across time steps
        
        # Add positional encoding
        x = self.pos_encoding(x)
        
        # Pass through transformer layers
        attention_weights_list = []
        for layer in self.encoder_layers:
            x, attn_weights = layer(x)
            if return_attention:
                attention_weights_list.append(attn_weights)
        
        # Use the last time step for prediction
        x = x[:, -1, :]  # [batch, d_model]
        
        # Project to output
        output = self.output_projection(x)  # [batch, n_targets * pred_horizon]
        output = output.view(batch_size, self.pred_horizon, self.n_targets)
        
        if return_attention:
            return output, torch.stack(attention_weights_list, dim=1)
        return output, None
    
    def get_config(self) -> dict:
        """Get model configuration for saving."""
        return {
            'n_features': self.n_features,
            'n_targets': self.n_targets,
            'n_entities': self.n_entities,
            'd_model': self.d_model,
            'num_heads': self.encoder_layers[0].self_attn.num_heads,
            'num_layers': len(self.encoder_layers),
            'd_ff': self.encoder_layers[0].feed_forward.linear1.out_features,
            'lookback': self.lookback,
            'pred_horizon': self.pred_horizon
        }
    
    @classmethod
    def from_config(cls, config: dict) -> 'PanelTransformer':
        """Create model from configuration."""
        return cls(**config)


class PolicyPredictor:
    """
    Wrapper class for making predictions with a trained model.
    Handles model loading, inference, and result formatting.
    """
    
    def __init__(self, model: PanelTransformer, device: str = 'cpu'):
        self.model = model
        self.device = device
        self.model.to(device)
        self.model.eval()
    
    def predict(
        self, 
        x: torch.Tensor, 
        entity_ids: torch.Tensor,
        return_attention: bool = False
    ) -> dict:
        """Make predictions with the model."""
        self.model.eval()
        
        with torch.no_grad():
            x = x.to(self.device)
            entity_ids = entity_ids.to(self.device)
            
            predictions, attention = self.model(x, entity_ids, return_attention)
            
            result = {
                'predictions': predictions.cpu().numpy()
            }
            
            if return_attention and attention is not None:
                result['attention_weights'] = attention.cpu().numpy()
            
            return result
    
    def predict_scenarios(
        self,
        base_features: torch.Tensor,
        entity_ids: torch.Tensor,
        feature_modifications: dict,
        feature_names: list
    ) -> dict:
        """
        Predict outcomes under different policy scenarios.
        
        Args:
            base_features: Base feature tensor [batch, lookback, n_features]
            entity_ids: Entity IDs
            feature_modifications: Dict mapping scenario names to feature changes
            feature_names: List of feature names
            
        Returns:
            Dictionary with predictions for each scenario
        """
        results = {}
        
        # Baseline prediction
        results['baseline'] = self.predict(base_features, entity_ids)['predictions']
        
        # Modified scenarios
        for scenario_name, modifications in feature_modifications.items():
            modified_features = base_features.clone()
            
            for feature_name, change in modifications.items():
                if feature_name in feature_names:
                    idx = feature_names.index(feature_name)
                    modified_features[:, :, idx] += change
            
            results[scenario_name] = self.predict(modified_features, entity_ids)['predictions']
        
        return results
