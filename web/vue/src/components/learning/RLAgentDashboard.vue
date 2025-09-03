<template>
  <div class="finrl-dashboard">
    <header class="sticky-header">
      <h1>FinRL RL Agent Training</h1>
      <p class="tagline">Configure, train, and analyze RL agents for trading.</p>
    </header>
    <main class="dashboard-main">
      <section class="config-section card">
        <h2>Configuration</h2>
        <form @submit.prevent="startTraining" class="config-form">
          <!-- Dataset picker from backtest -->
          <dataset-picker class="my2" @dataset="onDatasetSelected" />
          <details open>
            <summary>Data & Environment</summary>
            <div class="form-row">
              <label>Initial Capital</label>
              <input type="number" v-model.number="config.capital" min="1000" step="100" name="capital" />
              <label>Tickers</label>
              <input type="text" v-model="config.tickers" placeholder="AAPL,MSFT,GOOG" name="tickers" />
            </div>
            <div class="form-row">
              <label>Candle Size</label>
              <input type="number" v-model.number="config.candle_size_value" min="1" step="1" style="max-width:80px;" />
              <select v-model="config.candle_size_unit" style="max-width:120px;">
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </div>
            <div class="form-row">
              <label>
                Indicators
                <span class="info-bubble" tabindex="0" aria-label="Indicator selection help">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style="vertical-align: middle;">
                    <circle cx="10" cy="10" r="9" stroke="#3498db" stroke-width="2" fill="#fff"/>
                    <text x="10" y="15" text-anchor="middle" font-size="13" fill="#3498db" font-family="Arial" font-weight="bold">i</text>
                  </svg>
                  <span class="info-tooltip">
                    <strong>How to select indicators:</strong><br>
                    Hold <kbd>Ctrl</kbd> (Windows) or <kbd>Cmd</kbd> (Mac) to select multiple.<br>
                    Only highlighted indicators are used for training.
                  </span>
                </span>
              </label>
              <select v-model="config.indicators" multiple name="indicators">
                <option v-for="ind in indicatorOptions" :key="ind" :value="ind">{{ ind }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>Buy Cost (%)</label>
              <input type="number" v-model.number="config.buy_cost_pct" min="0" max="0.1" step="0.001" name="buy_cost_pct" />
              <label>Sell Cost (%)</label>
              <input type="number" v-model.number="config.sell_cost_pct" min="0" max="0.1" step="0.001" name="sell_cost_pct" />
            </div>
            <div class="form-row">
              <label>Max Shares per Trade (hmax)</label>
              <input type="number" v-model.number="config.hmax" min="1" step="1" name="hmax" />
              <label>Reward Scaling</label>
              <input type="number" v-model.number="config.reward_scaling" min="0" step="0.0001" name="reward_scaling" />
            </div>
            <div class="form-row">
              <label>Turbulence Threshold</label>
              <input type="number" v-model.number="config.turbulence_threshold" min="0" step="1" name="turbulence_threshold" />
              <label>Risk Indicator Column</label>
              <input type="text" v-model="config.risk_indicator_col" name="risk_indicator_col" />
            </div>
            <div class="form-row">
              <label style="display:flex; align-items:center; gap:15px; margin-bottom:0;">
                <input type="checkbox" v-model="config.make_plots" name="make_plots" />
                Enable Plots
              </label>
            </div>
          </details>
          <details>
            <summary>Model & Training</summary>
            <div class="form-row">
              <label>Strategy</label>
              <select v-model="config.strategy" name="strategy">
                <option v-for="s in strategyOptions" :key="s" :value="s">{{ s }}</option>
              </select>
              <label>Policy Type</label>
              <select v-model="config.policy" name="policy">
                <option v-for="p in policyOptions" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>Learning Rate</label>
              <input type="number" v-model.number="config.learning_rate" min="0.00001" max="0.01" step="0.00001" name="learning_rate" />
              <label>Batch Size</label>
              <input type="number" v-model.number="config.batch_size" min="16" max="512" step="16" name="batch_size" />
            </div>
            <div class="form-row">
              <label>Entropy Coefficient</label>
              <input type="number" v-model.number="config.ent_coef" min="0" max="1" step="0.001" name="ent_coef" />
              <label>Total Timesteps</label>
              <input
                type="number"
                v-model.number="config.total_timesteps"
                min="1"
                step="1"
                name="total_timesteps"
                required
                placeholder="e.g. 2048"
                autocomplete="off"
              />
            </div>
            <div class="form-row">
              <label>Device</label>
              <select v-model="config.device" name="device">
                <option value="cpu">CPU</option>
                <option value="cuda">GPU (CUDA)</option>
              </select>
            </div>
          </details>
          <details>
            <summary>Miscellaneous</summary>
            <div class="form-row">
              <label style="display:flex; align-items:center; gap:15px; margin-bottom:0;">
                <input type="checkbox" v-model="config.save_model" name="save_model" />
                Save Model
              </label>
              <label style="display:flex; align-items:center; gap:15px; margin-bottom:0;">
                <input type="checkbox" v-model="config.verbose" name="verbose" />
                Verbose Logging
              </label>
              <div style="display: flex; flex-direction: column; flex: 1; min-width: 120px;">
                <label for="seed" style="margin-bottom: 0.25rem; color: #3498db; font-weight: 500;">Random Seed</label>
                <input type="number" v-model.number="config.seed" min="0" step="1" name="seed" id="seed" />
              </div>
            </div>
              <!-- 🔽 NEW: Model name input -->
              <div class="form-row">
                <div style="display: flex; flex-direction: column; flex: 1; min-width: 200px;">
                  <label for="model_name" style="margin-bottom: 0.25rem; color: #3498db; font-weight: 500;">Model Name</label>
                  <input
                    type="text"
                    v-model="config.model_name"
                    name="model_name"
                    id="model_name"
                    placeholder="Enter a name for the model"
                  />
                </div>
              </div>
          </details>
          <button class="train-btn" type="submit" :disabled="isTraining">
            <span v-if="!isTraining"><span class="rocket">🚀</span> Train Model</span>
            <span v-else>Training...</span>
          </button>
        </form>
      </section>

      <section class="progress-section card" v-if="isTraining">
        <h2>Training Progress</h2>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        </div>
        <div class="progress-details">
          <p class="step-info">Steps: {{ trainingStatus?.current_step }} / {{ trainingStatus?.total_steps }}</p>
          <p class="progress-text">Progress: {{ progressPercentage }}%</p>
          <p v-if="trainingStatus?.episode">Episode: {{ trainingStatus.episode }}</p>
          <p v-if="trainingStatus?.device">Device: {{ trainingStatus.device }}</p>
        </div>
        <div class="scan-btn">
          <p>Training in progress...</p>
          <spinner />
        </div>
      </section>

      <section class="training-stats card" v-if="Object.keys(trainingStats).length">
        <h2>Training Results</h2>
        <div class="stat-grid">
          <div class="stat-item">
            <label>Final Portfolio Value</label>
            <div class="value">{{ formatCurrency(trainingStats.portfolio_value) }}</div>
          </div>
          <div class="stat-item">
            <label>Total Trades</label>
            <div class="value">{{ trainingStats.total_trades }}</div>
          </div>
          <div class="stat-item">
            <label>Returns</label>
            <div class="value">{{ formatPercentage(trainingStats.returns) }}</div>
          </div>
          <div class="stat-item" v-if="trainingStats.sharpe">
            <label>Sharpe Ratio</label>
            <div class="value">{{ trainingStats.sharpe.toFixed(2) }}</div>
          </div>
        </div>
      </section>

      <!-- Models Section -->
      <section class="models-section card">
        <h2>Saved Models</h2>
        <div v-if="isLoadingModels">Loading models...</div>
        <div v-else-if="!models.length" class="no-models">No models found.</div>
        <ul v-else class="model-list">
          <li v-for="m in models" :key="m.name" class="model-item">
            <div class="model-card">
              <div class="model-info">
                <strong>{{ m.name }}</strong>
                <small v-if="m.timestamp"> ({{ m.timestamp }})</small>
              </div>
              <div class="model-actions">
                <button @click="sendToBacktest(m.name)">Send to Backtest</button>
                <button @click="deleteModel(m.name)">Delete</button>
              </div>
            </div>
          </li>
        </ul>
        <div v-if="modelError" class="error-message">
          <p class="error">{{ modelError }}</p>
        </div>
        <div v-if="backtestStatus" class="success-message">
          <p>{{ backtestStatus }}</p>
        </div>
      </section>

      <section class="error-message card" v-if="error && error !== 'Training job started. Waiting for results...'">
        <p class="error">{{ error }}</p>
      </section>
    </main>
  </div>
</template>


<script setup>
import { ref, computed, onBeforeUnmount, onMounted } from 'vue';
import { post, get, del } from '../../tools/ajax';
import spinner from '../global/blockSpinner.vue';
import datasetPicker from '../global/configbuilder/datasetpicker.vue';
import CryptoJS from 'crypto-js'; // Use CryptoJS for hashing
import stringify from 'json-stable-stringify';

function hashConfig(configString) {
  // Use CryptoJS to hash the config string
  const hash = CryptoJS.SHA256(configString).toString(CryptoJS.enc.Hex);
  return hash.slice(0, 8); // Shorten for identifier
}

function generateModelIdentifier(baseName, config) {
  // Use stable serialization for nested objects/arrays
  const configString = stringify(config);
  const hash = hashConfig(configString);
  const now = new Date();
  // Format as YYYYMMDD-HHMMSS for readability
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '-');
  const safeBase = baseName && baseName.trim() ? baseName.trim().replace(/\s+/g, '_') : 'model';
  return `${safeBase}_${hash}_${timestamp}`;
}

const isTraining = ref(false);
const trainingStatus = ref(null);
const trainingStats = ref({});
const error = ref(null); // for training errors
const trainingError = error; // alias for clarity
const modelError = ref(null); // for model CRUD errors
const ws = ref(null);
const models = ref([]); // list of saved models
const isLoadingModels = ref(false);
const backtestStatus = ref('');

const config = ref({
  start_date: '2020-01-01',
  end_date: '2020-12-31',
  capital: 100000,
  tickers: 'BTC/USD',
  indicators: ['turbulence'],
  buy_cost_pct: 0.001,
  sell_cost_pct: 0.001,
  hmax: 100,
  reward_scaling: 1,
  turbulence_threshold: 1000,
  risk_indicator_col: 'turbulence',
  make_plots: false,
  strategy: 'ppo',
  policy: 'MlpPolicy',
  learning_rate: 0.00025,
  batch_size: 64,
  total_timesteps: 2048,
  ent_coef: 0.01,
  device: 'cpu',
  save_model: false,
  verbose: false,
  seed: 42,
  candle_size_value: 1,
  candle_size_unit: 'hours',
  model_name: ''
});

const indicatorOptions = [
  'macd', 'boll_ub', 'boll_lb', 'rsi_30', 'cci_30', 'dx_30', 'close_30_sma', 'close_60_sma',
];
const strategyOptions = ['ppo', 'a2c', 'ddpg', 'sac', 'td3'];
const policyOptions = ['MlpPolicy', 'CnnPolicy'];

const candleSize = computed(() => {
  const value = config.value.candle_size_value;
  const unit = config.value.candle_size_unit;
  if (unit === 'minutes') return value;
  if (unit === 'hours') return value * 60;
  if (unit === 'days') return value * 60 * 24;
  return value;
});
const progressPercentage = computed(() => {
  if (!trainingStatus.value?.current_step || !trainingStatus.value?.total_steps) return 0;
  return Math.min(100, Math.round((trainingStatus.value.current_step / trainingStatus.value.total_steps) * 100));
});

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

function formatPercentage(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00%';
  }
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return '0.00%';
  }
  const displayValue = Math.abs(numValue) > 2 ? numValue / 100 : numValue;
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(displayValue);
}

const selectedDataset = ref(null);
const selectedDatasetDates = ref({ from: null, to: null });

function onDatasetSelected(dataset) {
  // Update config fields based on selected dataset
  selectedDataset.value = dataset;
  if (!dataset) {
    selectedDatasetDates.value = { from: null, to: null };
    return;
  }
  if (dataset.from) {
    config.value.start_date = dataset.from;
    selectedDatasetDates.value.from = dataset.from;
  }
  if (dataset.to) {
    config.value.end_date = dataset.to;
    selectedDatasetDates.value.to = dataset.to;
  }
  if (dataset.asset && dataset.currency) {
    config.value.tickers = `${dataset.asset}/${dataset.currency}`;
  } else if (dataset.asset) {
    config.value.tickers = dataset.asset;
  }
  // Optionally update other config fields if available
}

async function startTraining() {
  // Basic client-side validation for required fields
  const requiredFields = [
    'capital', 'tickers', 'buy_cost_pct', 'sell_cost_pct',
    'hmax', 'reward_scaling', 'turbulence_threshold', 'risk_indicator_col', 'strategy', 'policy',
    'learning_rate', 'batch_size', 'total_timesteps', 'ent_coef', 'device', 'seed',
    'candle_size_value', 'candle_size_unit'
  ];
  // Dataset must be selected
  if (!selectedDataset.value) {
    trainingError.value = 'Please select a dataset.';
    return;
  }
  // Dates must be present in selected dataset
  if (!selectedDatasetDates.value.from || !selectedDatasetDates.value.to) {
    trainingError.value = 'Selected dataset does not have valid start/end dates.';
    return;
  }
  // Validate other required fields
  for (const field of requiredFields) {
    const value = config.value[field];
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      trainingError.value = `Please fill in the required field: ${field.replace(/_/g, ' ')}`;
      return;
    }
  }
  isTraining.value = true;
  trainingError.value = null;
  trainingStats.value = {};
  await connectWebSocket();
  // Log the outgoing request for debugging
  console.log('Sending training request:', { dataset: selectedDataset.value, ...config.value });
  // Remove candle_size_value and candle_size_unit from config before sending
  const { candle_size_value, candle_size_unit, ...restConfig } = config.value;
  // Generate model identifier if saving is enabled
  let modelIdentifier = null;
  if (config.value.save_model) {
    modelIdentifier = await generateModelIdentifier(config.value.model_name, restConfig);
    restConfig.model_identifier = modelIdentifier;
  }
  post('train', { dataset: selectedDataset.value, ...restConfig, candle_size: candleSize.value }, (err, response) => {
    if (err) {
      // Log error to console for debugging
      console.error('AJAX error:', err);
      error.value = 'Failed to start training: ' + (err.message || err);
      isTraining.value = false;
      return;
    }
    // Log response for debugging
    console.log('Training response:', response);
    if (response && response.status === 'completed') {
      trainingStats.value = {
        portfolio_value: response.final_portfolio_value,
        total_trades: response.total_trades,
        returns: response.returns,
        sharpe: response.sharpe
      };
      isTraining.value = false;
      if (config.value.save_model) fetchModels();
    } else if (response && response.status === 'started') {
      // Show job started message if available
      error.value = 'Training job started. Waiting for results...';
    } else {
      error.value = 'Unexpected response from backend.';
      isTraining.value = false;
    }
  });
}

function connectWebSocket() {
  return new Promise((resolve, reject) => {
    if (ws.value) ws.value.close();
    ws.value = new WebSocket('ws://localhost:5000/ws');
    ws.value.onopen = () => resolve();
    ws.value.onerror = (e) => reject(e);
    ws.value.onmessage = (event) => {
      const status = JSON.parse(event.data);
      // Assign all status fields for full progress info
      trainingStatus.value = status;
      const updateMetrics = (metrics) => {
        if (metrics && (metrics.portfolio_value !== undefined || metrics.total_trades !== undefined)) {
          const returns = parseFloat(metrics.returns);
          const sharpe = parseFloat(metrics.sharpe);
          trainingStats.value = {
            portfolio_value: metrics.portfolio_value || 0,
            total_trades: metrics.total_trades || 0,
            returns: isNaN(returns) ? 0 : returns,
            sharpe: isNaN(sharpe) ? null : sharpe
          };
          return true;
        }
        return false;
      };
      const hasMetrics =
        updateMetrics(status.metrics) ||
        updateMetrics({
          portfolio_value: status.portfolio_value,
          total_trades: status.total_trades,
          returns: status.returns,
          sharpe: status.sharpe
        });
      if (hasMetrics) {
        isTraining.value = false;
        setTimeout(() => {
          ws.value.close();
        }, 500);
        return;
      }
    };
    ws.value.onclose = () => {
      if (isTraining.value) {
        // Optionally, you can set an error or retry logic here
        error.value = 'Training connection closed before completion.';
      }
    };
  });
}

// Fetch models from backend
async function fetchModels() {
  isLoadingModels.value = true;
  modelError.value = null;

  try {
    // Use your GET wrapper (or axios directly if no helper is set up)
    get('models', (err, response) => {
      if (err) {
        console.error('AJAX error:', err);
        modelError.value = 'Failed to fetch models list.';
        return;
      }

      console.log('Models response:', response);

      // Expecting an array of models
      if (Array.isArray(response.models) || Array.isArray(response)) {
        models.value = response.models || response;
      } else {
        modelError.value = 'Unexpected response format from backend.';
      }
    });
  } catch (err) {
    console.error('Failed to fetch models:', err);
    modelError.value = 'Failed to fetch models list.';
  } finally {
    isLoadingModels.value = false;
  }
}

// Delete a model
async function deleteModel(name) {
  try {
    // Issue DELETE to wrapper route
    del(`models/${encodeURIComponent(name)}`, (err, response) => {
      if (err) {
        console.error('Failed to delete model:', err);
        modelError.value = 'Failed to delete model.';
        return;
      }
      console.log('Delete response:', response);

      // Auto-refresh model list after successful deletion
      fetchModels();
    });
  } catch (err) {
    console.error('Delete exception:', err);
    modelError.value = 'Failed to delete model.';
  }
}

// Send model to backtest
async function sendToBacktest(name) {
  try {
    // Call your Node wrapper route, e.g. POST /api/backtest
    post('backtest_setup', { model: name }, (err, response) => {
      if (err) {
        console.error('Error sending model to backtest:', err);
        modelError.value = 'Error sending model to backtest.';
        return;
      }

      console.log('Backtest setup response:', response);

      // Example: update UI with some status
      if (response.status === 'success') {
        backtestStatus.value = `Model ${name} is ready for backtest.`;
      } else {
        modelError.value = 'Unexpected response from backtest setup.';
      }
    });
  } catch (err) {
    console.error('Backtest exception:', err);
    modelError.value = 'Error sending model to backtest: ' + err.message;
  }
}

onMounted(() => {
  fetchModels();
});

onBeforeUnmount(() => {
  if (ws.value) ws.value.close();
});
</script>

<style scoped>
.finrl-dashboard {
  background: linear-gradient(180deg, #f8f9fa 0%, #eaf6fb 100%);
  min-height: 100vh;
  width: 100vw;
  overflow-x: hidden;
  padding-bottom: 4rem;
}
.sticky-header {
  position: sticky;
  top: 0;
  background: linear-gradient(90deg, #41b883 0%, #3498db 100%);
  color: white;
  padding: 2rem 1rem 1rem 6rem;
  box-shadow: 0 2px 8px rgba(52,152,219,0.08);
  z-index: 10;
}
.tagline {
  font-size: 1.2em;
  font-weight: 400;
  margin-top: 0.5rem;
  color: #eaf6fb;
}
.dashboard-main {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(52,152,219,0.08);
  margin-bottom: 2rem;
  padding: 2rem 1.5rem;
}
.config-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-bottom: 1rem;
}
.form-row label {
  min-width: 120px;
  font-weight: 500;
  color: #3498db;
}
.form-row input,
.form-row select {
  flex: 1;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #eee;
  font-size: 1em;
}
.form-row input[type="checkbox"] {
  width: 20px;
  height: 20px;
  margin-left: 0.5rem;
}
.form-field-checkbox {
  display: flex;
  align-items: center;
}
/* Train button styles */
.train-btn {
  background: linear-gradient(90deg, #41b883 0%, #3498db 100%);
  color: white;
  font-size: 1.2em;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  padding: 1rem 2rem;
  margin-top: 1rem;
  box-shadow: 0 2px 8px rgba(52,152,219,0.08);
  cursor: pointer;
  transition: background 0.3s, box-shadow 0.3s, transform 0.2s;
  position: relative;
  outline: none;
}
.train-btn:hover:not(:disabled) {
  background: linear-gradient(90deg, #3498db 0%, #41b883 100%);
  box-shadow: 0 4px 16px rgba(52,152,219,0.18);
  transform: translateY(-2px) scale(1.03);
}
.train-btn .rocket {
  margin-right: 0.5em;
  font-size: 1.2em;
  vertical-align: middle;
  transition: transform 0.2s;
}
.train-btn:hover .rocket {
  transform: scale(1.2) rotate(-10deg);
}
.train-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.progress-section {
  margin-top: 2rem;
  text-align: center;
}
.progress-bar {
  width: 100%;
  height: 28px;
  background: #eee;
  border-radius: 14px;
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
.success-message {
  margin-top: 1rem;
  padding: 1rem;
  background: #d4edda;
  border-radius: 4px;
  color: #155724;
}
.legacy-dashboard {
  margin-top: 4rem;
  padding: 2rem;
  background: #fffbe6;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(255,200,0,0.08);
}
/* Info bubble styles */
.info-bubble {
  display: inline-block;
  position: relative;
  margin-left: 8px;
  cursor: pointer;
  vertical-align: middle;
}
.info-bubble svg {
  transition: filter 0.2s;
  filter: drop-shadow(0 1px 2px rgba(52,152,219,0.15));
}
.info-bubble:hover svg,
.info-bubble:focus svg {
  filter: drop-shadow(0 2px 6px rgba(52,152,219,0.25));
}
.info-tooltip {
  display: none;
  position: absolute;
  left: 28px;
  top: -8px;
  background: #fff;
  color: #222;
  border: 1px solid #3498db;
  border-radius: 8px;
  padding: 12px 16px;
  font-size: 1em;
  min-width: 220px;
  max-width: 320px;
  z-index: 100;
  box-shadow: 0 4px 16px rgba(52,152,219,0.12);
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
  transition: opacity 0.2s, transform 0.2s;
}
.info-bubble:hover .info-tooltip,
.info-bubble:focus .info-tooltip {
  display: block;
  opacity: 1;
  transform: translateY(0) scale(1);
}
.info-tooltip kbd {
  background: #eaf6fb;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.95em;
  border: 1px solid #b5d6ea;
  font-family: inherit;
}
/* Models Section Styles */
.models-section {
  margin-top: 2rem;
}
.model-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.model-item {
  padding: 0.75rem 0;
}
.model-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(52,152,219,0.07);
  padding: 1rem 1.5rem;
  margin-bottom: 0.5rem;
}
.model-info {
  flex: 1;
  font-size: 1.1em;
  color: #34495e;
}
.model-actions {
  display: flex;
  gap: 0.5rem;
}
.model-actions button {
  padding: 0.4rem 0.9rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #3498db;
  color: white;
  font-size: 1em;
  box-shadow: 0 1px 2px rgba(52,152,219,0.10);
  transition: background 0.2s;
}
.model-actions button:hover {
  background: #2980b9;
}
.no-models {
  color: #888;
  font-size: 1.1em;
  text-align: center;
  padding: 1.5rem 0;
}
</style>
