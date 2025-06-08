const axios = require('axios');

module.exports = async (ctx) => {
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

    console.log('Sending payload to RL API:', payload);

    // POST to the RL agent REST API
    const res = await axios.post('http://127.0.0.1:5000/api/train', payload);

    ctx.body = {
      jobId: res.data.jobId || 'unknown',
      status: 'started'
    };
  } catch (err) {
    console.error('Error forwarding to RL API:', err.message || err);
    ctx.status = 500;
    ctx.body = { error: 'Failed to start training job.' };
  }
};
