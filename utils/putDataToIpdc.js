import * as jsonld from 'jsonld';
import { IPDC_JSON_ENDPOINT, IPDC_X_API_KEY } from '../env-config';
export async function putDataToIpdc(subjectsAndData) {
  let ttl = ''
  for (const subject of Object.keys(subjectsAndData)) {
    const body = subjectsAndData[subject].body
    ttl += body;
  }
  //bug/feature in jsonld rdf parser?
  //my best attempt at changing triple quotes to single quotes and escaping " and \n
  ttl = ttl.replace(/([^"]""")([\s\S]*?)("""[^"])/g, function (match, group1, group2, group3) {
    group2 = group2.replaceAll(`\n`, `\\n`);
    group2 = group2.replaceAll(`"`, `\\"`);
    group1 = group1.replace(`"""`, `"`);
    group3 = group3.replace(`"""`, `"`);
    const result = `${group1}${group2}${group3}`
    return result;
  });
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

  if (!response.ok) {
    throw new Error(response);
  }
}