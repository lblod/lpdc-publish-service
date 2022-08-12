import { app, errorHandler, sparqlEscapeUri } from 'mu';
import { CronJob } from 'cron';
import fetch  from 'node-fetch';
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import { prefixes } from "./prefixes";
import {
  CRON_PATTERN,
  LDES_ENDPOINT,
  LDES_FOLDER,
} from './env-config';
import { getPublicServiceDetails } from './queries';

//TODO:
// - move this.
// - add label STATUS_PUBLISHED_URI, with migration
const STATUS_PUBLISHED_URI ="http://lblod.data.gift/concepts/3369bb10-1962-11ed-b07c-132292303e92";
const SENT_URI = "http://lblod.data.gift/concepts/9bd8d86d-bb10-4456-a84e-91e9507c374c";

/*
 * TODO: move to queries
 * Poll data from any graphs
 */
async function getUnpublishedServices() {
   const queryString = `
   ${prefixes}
   SELECT DISTINCT ?publicservice WHERE {
     GRAPH ?graph {
       ?publicservice a cpsv:PublicService;
         adms:status ${sparqlEscapeUri(SENT_URI)}.
     }
     FILTER NOT EXISTS{
      ?publicservice schema:publication ${sparqlEscapeUri(STATUS_PUBLISHED_URI)}.
     }
   }`;
  const result = (await query(queryString)).results.bindings;
  return result;
};

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

/*
 * TODO: move to queries
 * update the status of posted data.
 */
async function updateStatusPublicService(uri) {
  const statusUpdate = `
  ${prefixes}

  INSERT {
    GRAPH ?g {
      ?service schema:publication ${sparqlEscapeUri(STATUS_PUBLISHED_URI)}.
    }
  }
  WHERE {
    BIND(${sparqlEscapeUri(uri)} as ?service)
    GRAPH ?g {
     ?service a cpsv:PublicService.
    }
  }
  `;
  const resp = await update(statusUpdate);
  return resp.results.bindings;

};

new CronJob( CRON_PATTERN, async () => {
  try{
    const unpublishedServices = await getUnpublishedServices();

    console.log(`Found ${unpublishedServices.length} to publish`);

    for(const service of unpublishedServices) {
      try {
        const subjectsAndData = await getPublicServiceDetails(service.publicservice.value);

        for(const entry of subjectsAndData) {
          await postDataToLDES(entry.subject, entry.body);
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
