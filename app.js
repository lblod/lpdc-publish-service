import {app, errorHandler} from 'mu';
import {CronJob} from 'cron';
import bodyparser from 'body-parser';
import {
  getPublicServiceDetails,
  getServicesToPublish,
  updateDatePublishedPublicService,
} from './queries';
import {putDataToIpdc} from './utils/putDataToIpdc';
import {
  CRON_PATTERN,
} from './env-config';
import {clearPublicationErrors} from "./utils/publication-error";

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

        //TODO LPDC-1236: update ids in memory: the first level ids should be replaced by the one that is in version of
        //TODO LPDC-1236: remove version of triple
        //TODO LPDC-1236: update type : PublishedInstancePublicServiceSnapshot => InstancePublicService ; Tombstone stays

        await putDataToIpdc(service.graph.value, service.publishedPublicService.value, subjectsAndData);
        await updateDatePublishedPublicService(service.publishedPublicService.value, service.type.value);

        console.log(`Successfully published ${service.publishedPublicService.value} of ${service.publicservice?.value}`);
      } catch (e) {
        console.error(`Could not publish ${service.publishedPublicService.value} of ${service.publicservice?.value}`, e);
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
