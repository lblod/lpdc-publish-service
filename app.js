import { app, errorHandler, sparqlEscapeUri } from 'mu';
import { CronJob } from 'cron';
import bodyparser from 'body-parser';
import fetch  from 'node-fetch';
import { getPublicServiceDetails, getServicesToPublish, updateStatusPublicService, STATUS_PUBLISHED_URI } from './queries';
import { extractHeadersFromEnv } from './utils/extractHeadersFromEnv';
import { putDataToIpdc } from './utils/putDataToIpdc';
import {
  CRON_PATTERN,
  LDES_ENDPOINT,
  LDES_FOLDER,
  LDES_ENDPOINT_HEADER_PREFIX,
  LOG_INCOMING_DELTA
} from './env-config';
import { processDelta } from './deltaPostProcess';

app.use(bodyparser.json());

/*
*  route for getting deltas
*/
app.post("/delta", async function (req, res) {
  try{
    const body = req.body;
    if (LOG_INCOMING_DELTA){
      console.log(`Receiving delta : ${JSON.stringify(body)}`);
    }

    await processDelta(body);

    res.status(202).send();
  } catch(error){
    console.log(error);
    res.status(500).send();
  }
});


/*
 * send data to ldes feed
 */
async function postDataToLDES(uri, body) {
  try {
    const queryParams = new URLSearchParams({
      resource: uri
    });

    const headers = extractHeadersFromEnv(LDES_ENDPOINT_HEADER_PREFIX);
    headers["Content-Type"] = "text/turtle";

    const response = await fetch(`${LDES_ENDPOINT}/${LDES_FOLDER}?` + queryParams, {
      method: "POST",
      headers,
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
    const unpublishedServices = await getServicesToPublish();

    console.log(`Found ${unpublishedServices.length} to publish`);

    for(const service of unpublishedServices) {
      try {
        const subjectsAndData = await getPublicServiceDetails(service.publicservice.value);

        for(const subject of Object.keys(subjectsAndData)) {
          await postDataToLDES(subject, subjectsAndData[subject].body);
        }
        await putDataToIpdc(subjectsAndData);
        await updateStatusPublicService(service.publicservice.value, STATUS_PUBLISHED_URI);

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
