import { app, errorHandler, uuid } from 'mu';
import { CronJob } from 'cron';
import {
  CRON_PATTERN,
} from './env-config'


const pollingJob: CronJob = new CronJob( CRON_PATTERN, async () => {
  // poll data here
}, null, true);

