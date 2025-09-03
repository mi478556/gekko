const axios = require('axios');

async function train(ctx) {
  try {
    // Provide defaults if any expected fields are missing
    const defaultPayload = {
      strategy: "ppo",
      start_date: "2020-01-01",
      end_date: "2020-12-31",
      capital: 100000
    };

    // Merge defaults with any incoming request body
    const payload = {
      ...defaultPayload,
      ...(ctx.request.body || {})
    };

    // Ensure candle_size is inside the dataset object
    if (payload.candle_size && payload.dataset) {
      payload.dataset.candle_size = payload.candle_size;
    }

    console.log('Sending payload to RL API:', payload);

    // POST to the RL agent REST API
    const res = await axios.post('http://127.0.0.1:5000/api/train', payload);
    
    console.log('API Response:', res.data);
    
    // Handle error responses from RL API
    if (res.data.status === 'error' || res.data.error || res.data.message) {
      const errorMsg = res.data.error || res.data.message || 'Unknown error from RL API.';
      console.error('RL API returned error:', errorMsg);
      ctx.status = 500;
      ctx.body = { error: errorMsg };
      return;
    }
    // Check if we have valid training results (not just the initial fallback values)
    if (res.data.status === 'training complete' && (res.data.evaluation_success === undefined || res.data.evaluation_success)) {
      const response = {
        status: 'completed',
        final_portfolio_value: res.data.final_portfolio_value,
        total_trades: res.data.total_trades,
        returns: res.data.returns,
        sharpe: res.data.sharpe,
        metrics: {
          portfolio_value: res.data.final_portfolio_value,
          total_trades: res.data.total_trades,
          returns: res.data.returns,
          sharpe: res.data.sharpe
        }
      };
      console.log('Sending completed training results to frontend:', response);
      ctx.body = response;
    } else {
      // If we only have a job ID, send that
      const response = {
        jobId: res.data.jobId || 'unknown',
        status: 'started'
      };
      console.log('Sending training started response to frontend:', response);
      ctx.body = response;
    }
  } catch (err) {
    console.error('Error forwarding to RL API:', err.message || err);
    ctx.status = 500;
    ctx.body = { error: 'Failed to start training job.' };
  }
};

async function list(ctx) {
  try {
    console.log('Requesting models list from RL API...');

    // Call the FastAPI endpoint on port 5000
    const res = await axios.get('http://127.0.0.1:5000/api/models');

    console.log('API Response:', res.data);

    // Respond back to frontend
    ctx.body = {
      status: 'success',
      models: res.data
    };
  } catch (err) {
    console.error('Error fetching models list:', err.message || err);
    ctx.status = 500;
    ctx.body = { error: 'Failed to fetch models list.' };
  }
};

// Delete model handler
async function remove(ctx) {
  try {
    const { name } = ctx.params; // from /api/models/:name

    console.log(`Requesting model delete from RL API for: ${name}`);

    const res = await axios.delete(`http://127.0.0.1:5000/api/models/${encodeURIComponent(name)}`);

    console.log('Delete response:', res.data);

    ctx.body = {
      status: 'success',
      ...res.data
    };
  } catch (err) {
    console.error('Error deleting model:', err.message || err);
    ctx.status = err.response?.status || 500;
    ctx.body = {
      error: err.response?.data?.detail || 'Failed to delete model.'
    };
  }
}

// Send model to backtest setup
async function backtest_setup(ctx) {
  try {
    const { model } = ctx.request.body;

    if (!model) {
      ctx.status = 400;
      ctx.body = { error: 'Model name is required.' };
      return;
    }

    console.log(`Forwarding model ${model} to RL API backtest setup`);

    // Forward request to FastAPI (assuming you have @app.post("/api/backtest"))
    const res = await axios.post('http://127.0.0.1:5000/api/backtest_setup', { model });

    console.log('Backtest setup response:', res.data);

    ctx.body = {
      status: 'success',
      ...res.data
    };
  } catch (err) {
    console.error('Error sending model to backtest:', err.message || err);
    ctx.status = err.response?.status || 500;
    ctx.body = {
      error: err.response?.data?.detail || 'Failed to send model to backtest.'
    };
  }
}

module.exports = { train, list, remove, backtest_setup };