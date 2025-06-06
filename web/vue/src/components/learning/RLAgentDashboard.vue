<template lang='pug'>
  div
    h2.contain RL Agent Dashboard
    .hr
    .txt--center
      a.w100--s.my1.btn--primary(
        href='#',
        v-if='trainState !== "fetching"',
        @click.prevent='startTraining'
      ) Train Model
      div(v-if='trainState === "fetching"').scan-btn
        p Training in progress...
        spinner

    div(v-if='trainResult && trainState === "fetched"')
      p Job Started: {{ trainResult.jobId }}
</template>

<script>
import { post } from '../../tools/ajax';
import spinner from '../global/blockSpinner.vue';

export default {
  data: () => ({
    trainState: 'idle',
    trainResult: false
  }),
  methods: {
    startTraining() {
      this.trainState = 'fetching';

      post('train', {}, (error, response) => {
        this.trainState = 'fetched';

        if (error) {
          console.error('Training error:', error);
          this.trainResult = { error: 'Failed to start training.' };
        } else {
          this.trainResult = response;
        }
      });
    }
  },
  components: {
    spinner
  }
};
</script>
