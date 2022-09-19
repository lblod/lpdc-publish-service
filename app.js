import { app, errorHandler, sparqlEscapeUri } from 'mu';
import { CronJob } from 'cron';
import bodyparser from 'body-parser';
import fetch  from 'node-fetch';
import { getPublicServiceDetails, getUnpublishedServices, updateStatusPublicService } from './queries';
import { prefixes } from "./prefixes";
import {
  CRON_PATTERN,
  LDES_ENDPOINT,
  LDES_FOLDER,
} from './env-config';

app.use(bodyparser.json());

/*
*  route for getting deltas
*/
app.post("/delta", async function (req, res) {
});


/*
 * send data to ldes feed
 */
async function postDataToLDES(uri, body) {
  try {
    const queryParams = new URLSearchParams({
      resource: uri
    });

    const response = await fetch(`${LDES_ENDPOINT}/${LDES_FOLDER}?` + queryParams, {
      method: "POST",
      headers: {
        "Content-Type": "text/turtle",
      },
      body: body,
    });

    if(!response.ok) {
      throw new Error(response);
    }

  } catch (e) {
    console.log(e);
    throw e;
  }
}

new CronJob( CRON_PATTERN, async () => {
  try{
    const unpublishedServices = await getUnpublishedServices();

    console.log(`Found ${unpublishedServices.length} to publish`);

    for(const service of unpublishedServices) {
      try {
        const subjectsAndData = await getPublicServiceDetails(service.publicservice.value);

        for(const subject of Object.keys(subjectsAndData)) {
          await postDataToLDES(subject, subjectsAndData[subject].body);
        }

        await updateStatusPublicService(service.publicservice.value);

        console.log(`Successfully published ${service.publicservice.value}`);
      }
      catch(e) {
        console.error(e);
      }
    }
  } catch(e){
    console.error('General error fetching data, retrying later');
    console.log(e);
  }
}, null, true);


app.use(errorHandler);
