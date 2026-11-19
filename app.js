import { app, errorHandler } from "mu";
import { CronJob } from "cron";
import {
  getPublicServiceDetails,
  getServicesToPublish,
  updateDatePublishedPublicService,
  incrementRetryCounter,
  setRetryCounter,
} from "./queries";
import { putDataToIpdc, NonRetryableError } from "./utils/putDataToIpdc";
import { CRON_PATTERN, RETRY_COUNTER_LIMIT } from "./env-config";
import { clearPublicationErrors } from "./utils/publication-error";
let inProgress = false;

new CronJob(
  CRON_PATTERN,
  async () => {
    if (inProgress) {
      console.log("Process already in progress");
      return;
    }
    try {
      inProgress = true;
      const servicesToPublish = await getServicesToPublish();

      console.log(`Found ${servicesToPublish.length} to publish`);
      await clearPublicationErrors();
      for (const service of servicesToPublish) {
        try {
          const subjectsAndData = await getPublicServiceDetails(
            service.publishedPublicService.value,
          );

          await putDataToIpdc(service, subjectsAndData);
          await updateDatePublishedPublicService(
            service.publishedPublicService.value,
            service.type.value,
          );

          console.log(
            `Successfully published ${service.publishedPublicService.value} of ${service.publicservice?.value}`,
          );
        } catch (e) {
          if (e instanceof NonRetryableError) {
            // validation errors shouldn't be retried and are set as the limit
            await setRetryCounter(
              service.publishedPublicService.value,
              RETRY_COUNTER_LIMIT,
            );
            console.error(
              `Could not publish ${service.publishedPublicService.value} of ${
                service.publicservice?.value
              }, non-retryable error, giving up. Error: `,
              e,
            );
          } else {
            await incrementRetryCounter(service.publishedPublicService.value);
            const retriesLeft =
              RETRY_COUNTER_LIMIT - (service.publishRetryCount?.value ?? 0) - 1;
            console.error(
              `Could not publish ${service.publishedPublicService.value} of ${
                service.publicservice?.value
              }, ${retriesLeft} ${retriesLeft === 1 ? "retry" : "retries"} left${
                retriesLeft === 0 ? ", giving up" : ""
              }. Error: `,
              e,
            );
          }
        }
      }
    } catch (e) {
      console.error("General error fetching data, retrying later");
      console.log(e);
    } finally {
      inProgress = false;
    }
  },
  null,
  true,
);

app.use(errorHandler);
