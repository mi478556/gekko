const axios = require('axios');

module.exports = async (ctx) => {
  try {
    // POST to the RL agent REST API
    const res = await axios.post('http://localhost:5000/api/train', ctx.request.body || {});
    
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
