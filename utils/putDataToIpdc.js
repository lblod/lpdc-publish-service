import * as jsonld from 'jsonld';
import { IPDC_JSON_ENDPOINT, IPDC_X_API_KEY } from '../env-config';
export async function putDataToIpdc(subjectsAndData){  
  //try catch so it doesnt messup other parts of the cron job
  try {
    let ttl=''
    for(const subject of Object.keys(subjectsAndData)) {
      const body=subjectsAndData[subject].body
      ttl+=body;
    }
    
    //bug/feature in jsonld rdf parser?
    ttl=ttl.replaceAll(`"""`, `"`);

    const fromRdf = await jsonld.fromRDF(ttl);
    const doc = await jsonld.expand(fromRdf);



    const headers = {
      'x-api-key': IPDC_X_API_KEY,
      'Content-Type': 'application/ld+json'
    }

    const response = await fetch(IPDC_JSON_ENDPOINT, {
      method: "PUT",
      headers,
      body: doc,
    });

    if(!response.ok) {
      throw new Error(response);
    }

  } catch (e) {
    console.log(e);
  }
  
}