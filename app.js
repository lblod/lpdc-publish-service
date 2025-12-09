import {app, errorHandler} from 'mu';
import {CronJob} from 'cron';
import bodyparser from 'body-parser';
import {
  getPublicServiceDetails,
  getServicesToPublish,
  updateDatePublishedPublicService,
  incrementRetryCounter
} from './queries';
import {putDataToIpdc} from './utils/putDataToIpdc';
import {
  CRON_PATTERN,
} from './env-config';
import {clearPublicationErrors} from "./utils/publication-error";
import { RETRY_COUNTER_LIMIT } from './constants';

app.use(bodyparser.json());

let inProgress = false;

new CronJob(CRON_PATTERN, async () => {
  if (inProgress) {
    console.log('Process already in progress');
    return;
  }
  try {
    inProgress = true;
    const servicesToPublish = await getServicesToPublish();

    console.log(`Found ${servicesToPublish.length} to publish`);
    await clearPublicationErrors();
    for (const service of servicesToPublish) {
      try {
        const subjectsAndData = await getPublicServiceDetails(service.publishedPublicService.value);

        await putDataToIpdc(service.graph.value, service.publishedPublicService.value, subjectsAndData);
        await updateDatePublishedPublicService(service.publishedPublicService.value, service.type.value);

        console.log(`Successfully published ${service.publishedPublicService.value} of ${service.publicservice?.value}`);
      } catch (e) {
        await incrementRetryCounter(service.publishedPublicService.value);
        const retriesLeft = RETRY_COUNTER_LIMIT - (service.publishRetryCount?.value ?? 0) - 1;
        console.error(
          `Could not publish ${service.publishedPublicService.value} of ${
            service.publicservice?.value
          }, ${retriesLeft} ${retriesLeft === 1 ? "retry" : "retries"} left${
            retriesLeft === 0 ? ", giving up" : ""
          }. Error: `,
          e
        );
      }
    }
  } catch (e) {
    console.error('General error fetching data, retrying later');
    console.log(e);
  } finally {
    inProgress = false;
  }
}, null, true);

app.use(errorHandler);
