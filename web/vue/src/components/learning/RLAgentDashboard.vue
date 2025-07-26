<template lang='pug'>
  div
    h2.contain RL Agent Dashboard
    .hr
    .txt--center
      a.w100--s.my1.btn--primary(
        href='#',
        v-if='!isTraining',
        @click.prevent='startTraining'
      ) Train Model
      div(v-if='isTraining')
        .scan-btn
          p Training in progress...
          spinner
        .progress-container(v-if='trainingStatus && trainingStatus.current_step')
          .progress-bar
            .progress-fill(:style='{ width: progressPercentage + "%" }')
          .progress-details
            p.step-info Steps: {{ trainingStatus.current_step }} / {{ trainingStatus.total_steps }}
            p.progress-text Progress: {{ progressPercentage }}%

    .training-stats(v-if='Object.keys(trainingStats).length')
      h3 Training Results
      .stat-grid
        .stat-item
          label Final Portfolio Value
          .value {{ formatCurrency(trainingStats.portfolio_value) }}
        .stat-item
          label Total Trades
          .value {{ trainingStats.total_trades }}
        .stat-item
          label Returns
          .value {{ formatPercentage(trainingStats.returns) }}
        .stat-item
          label Sharpe Ratio
          .value {{ trainingStats.sharpe ? trainingStats.sharpe.toFixed(2) : 'N/A' }}
      
    .error-message(v-if='error')
      p.error {{ error }}
</template>

<script>
import { post } from '../../tools/ajax';
import spinner from '../global/blockSpinner.vue';

export default {
  data: () => ({
    isTraining: false,
    trainingStatus: null,
    trainingStats: {},
    error: null,
    ws: null
  }),
  computed: {
    progressPercentage() {
      if (!this.trainingStatus?.current_step || !this.trainingStatus?.total_steps) return 0;
      return Math.min(100, Math.round((this.trainingStatus.current_step / this.trainingStatus.total_steps) * 100));
    }
  },
  methods: {
    async startTraining() {
      console.log('Starting training...');
      this.isTraining = true;
      this.error = null;
      this.trainingStats = {};

      // Connect to WebSocket and wait for connection before starting training
      try {
        await this.connectWebSocket();
        console.log('WebSocket connected, starting training...');
        
        post('train', {
          strategy: 'ppo',
          start_date: '2020-01-01',
          end_date: '2020-12-31',
          capital: 100000
        }, (error, response) => {
          console.log('Post callback received:', { error, response });
          
          if (error) {
            console.error('Training error:', error);
            this.error = 'Failed to start training: ' + error.message;
            this.isTraining = false;
          } else {
            console.log('Training response:', response);
            // If we got completed training results in the HTTP response
            if (response.status === 'completed') {
              console.log('Training completed with results');
              this.trainingStats = {
                portfolio_value: response.final_portfolio_value,
                total_trades: response.total_trades,
                returns: response.returns
              };
              this.isTraining = false;
            } else {
              console.log('Training started, waiting for WebSocket updates...');
              // Keep isTraining true as we'll wait for WebSocket updates
            }
          }
        });
      } catch (error) {
        console.error('Connection error:', error);
        this.error = 'Failed to connect to training server';
        this.isTraining = false;
      }
    },
    
    connectWebSocket() {
      return new Promise((resolve, reject) => {
        // Close existing connection if any
        if (this.ws) {
          this.ws.close();
        }

        this.ws = new WebSocket('ws://localhost:5000/ws');
        
        this.ws.onopen = () => {
          console.log('WebSocket connection established');
          resolve();
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket connection error:', error);
          reject(error);
        };
        
        this.ws.onmessage = (event) => {
          console.log('WebSocket message received:', event.data);
          const status = JSON.parse(event.data);
          console.log('Parsed status update:', status);
          
          // Update training status and progress
          if (status.current_step !== undefined) {
            console.log('Updating training status:', {
              current: status.current_step,
              total: status.total_steps
            });
            this.trainingStatus = {
              current_step: status.current_step,
              total_steps: status.total_steps
            };
          }
          
          // Function to update metrics from any source
          const updateMetrics = (metrics) => {
            console.log('Updating metrics (raw):', metrics);
            if (metrics && (metrics.portfolio_value !== undefined || metrics.total_trades !== undefined)) {
              // Log each value with its type
              console.log('Metric values:', {
                portfolio_value: { value: metrics.portfolio_value, type: typeof metrics.portfolio_value },
                total_trades: { value: metrics.total_trades, type: typeof metrics.total_trades },
                returns: { value: metrics.returns, type: typeof metrics.returns },
                sharpe: { value: metrics.sharpe, type: typeof metrics.sharpe }
              });
              
              // Convert and validate each value
              const returns = parseFloat(metrics.returns);
              const sharpe = parseFloat(metrics.sharpe);
              
              this.trainingStats = {
                portfolio_value: metrics.portfolio_value || 0,
                total_trades: metrics.total_trades || 0,
                returns: isNaN(returns) ? 0 : returns,
                sharpe: isNaN(sharpe) ? null : sharpe
              };
              
              console.log('Updated training stats:', this.trainingStats);
              return true;
            }
            return false;
          };
          
          // Try to get metrics from different possible sources
          const hasMetrics = 
            updateMetrics(status.metrics) || // From metrics object
            updateMetrics({  // From direct properties
              portfolio_value: status.portfolio_value,
              total_trades: status.total_trades,
              returns: status.returns,
              sharpe: status.sharpe
            });
          
          if (hasMetrics) {
            // Training is complete with metrics
            console.log('Training complete with metrics, final stats:', this.trainingStats);
            this.isTraining = false;
            setTimeout(() => {
              this.ws.close();
            }, 500);
            return;
          }
          
          // Check if training is complete (but wait for metrics)
          const isComplete = 
            status.status === 'completed' || 
            !status.is_training || 
            (status.current_step !== undefined && status.current_step >= status.total_steps);
          
          if (isComplete) {
            console.log('Training progress complete, waiting for final metrics:', {
              status: status.status,
              is_training: status.is_training,
              progress: status.current_step + '/' + status.total_steps
            });
            // Keep training state true until we get metrics
          }
        };
        
        this.ws.onclose = () => {
          console.log('WebSocket connection closed');
          // If training was still in progress when connection closed, 
          // we might have missed the final results
          if (this.isTraining) {
            console.log('WebSocket closed while training, checking for completed results via HTTP...');
            // Give a moment for any final processing, then check status
            setTimeout(() => {
              this.checkTrainingStatus();
            }, 2000);
          }
        };
      });
    },
    
    async checkTrainingStatus() {
      try {
        console.log('Checking training status via HTTP...');
        const response = await fetch('http://localhost:5000/api/status');
        const status = await response.json();
        console.log('Status check response:', status);
        
        if (!status.is_training && (status.portfolio_value || status.total_trades)) {
          console.log('Found completed training results, updating UI...');
          this.trainingStats = {
            portfolio_value: status.portfolio_value || 0,
            total_trades: status.total_trades || 0,
            returns: status.returns || 0,
            sharpe: status.sharpe || null
          };
          this.isTraining = false;
        }
      } catch (error) {
        console.error('Error checking training status:', error);
      }
    },
    
    formatCurrency(value) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    },
    
    formatPercentage(value) {
      if (value === undefined || value === null || isNaN(value)) {
        return '0.00%';
      }
      
      // Convert to number if it's a string
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      
      if (isNaN(numValue)) {
        return '0.00%';
      }
      
      // Handle both decimal (0.05 = 5%) and percentage (5 = 5%) formats
      // If the absolute value is greater than 2, assume it's already a percentage
      const displayValue = Math.abs(numValue) > 2 ? numValue / 100 : numValue;
      
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(displayValue);
    }
  },
  
  beforeUnmount() {
    // Clean up WebSocket connection
    if (this.ws) {
      this.ws.close();
    }
  },
  
  components: {
    spinner
  }
};
</script>

<style scoped>
.progress-info {
  margin: 1rem 0;
  text-align: left;
}

.training-progress {
  margin: 2rem 0;
  text-align: center;
}

.progress-container {
  width: 100%;
  max-width: 600px;
  margin: 1rem auto;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.progress-bar {
  width: 100%;
  height: 24px;
  background: #eee;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1rem;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #41b883 0%, #3498db 100%);
  transition: width 0.3s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.progress-details {
  text-align: left;
  padding: 0.5rem;
}

.progress-text {
  font-size: 1.1em;
  font-weight: 500;
  color: #34495e;
  margin: 0.5rem 0;
}

.step-info {
  font-size: 1em;
  color: #2c3e50;
  margin: 0.5rem 0;
}

.device-info {
  font-size: 0.9em;
  color: #666;
  margin: 0.5rem 0;
}

.scan-btn {
  margin-bottom: 1rem;
}

.training-stats {
  margin-top: 2rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 8px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.stat-item {
  padding: 1rem;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-item label {
  display: block;
  color: #666;
  font-size: 0.9em;
  margin-bottom: 0.5rem;
}

.stat-item .value {
  font-size: 1.2em;
  font-weight: bold;
  color: #41b883;
}

.error-message {
  margin-top: 1rem;
  padding: 1rem;
  background: #fdd;
  border-radius: 4px;
  color: #c00;
}
</style>
