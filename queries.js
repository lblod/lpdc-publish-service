import { prefixes } from "./prefixes";
import { sparqlEscapeUri, sparqlEscapeDateTime, sparqlEscapeInt } from 'mu';
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import { bindingsToNT } from "./utils/bindingsToNT";
import { RETRY_COUNTER_LIMIT } from './constants.js';

const VERZONDEN_URI = "http://lblod.data.gift/concepts/instance-status/verzonden";

/*
 * Poll data from any graphs
 */
export async function getServicesToPublish() {
  const queryString = `
    ${prefixes}
    SELECT DISTINCT ?publicservice ?publishedPublicService ?type ?graph ?publishRetryCount
    WHERE {
      {
        SELECT ?publicservice (MAX(?generatedAt) AS ?maxGeneratedAt) ?graph
        WHERE {
          VALUES ?types {
                lpdcExt:PublishedInstancePublicServiceSnapshot
                 as:Tombstone
            }
          GRAPH ?graph {
            ?publishedPublicService a ?types;
                                    lpdcExt:isPublishedVersionOf ?publicservice;
                                    prov:generatedAtTime ?generatedAt.
          }
        }
        GROUP BY ?publicservice ?graph
      }
      GRAPH ?graph {
        ?publishedPublicService a ?type;
                                prov:generatedAtTime ?maxGeneratedAt.

        OPTIONAL {
          ?publishedPublicService ext:publishRetryCount ?publishRetryCount .
        }
      }
      FILTER NOT EXISTS {
            ?publishedPublicService schema:datePublished ?datePublished.
      }
      FILTER(COALESCE(?publishRetryCount, 0) < ${sparqlEscapeInt(RETRY_COUNTER_LIMIT)})
    }
  `;

  const result = (await query(queryString)).results.bindings;
  return result;
};

/*
 * update the status of posted data.
 */
export async function updateDatePublishedPublicService(uri, type) {
  const updateDatePublishedQuery = `
  ${prefixes}
  INSERT {
    GRAPH ?g {
      ?subject schema:datePublished ${sparqlEscapeDateTime(new Date())}.
    }
  }
  WHERE {
    BIND(${sparqlEscapeUri(uri)} as ?subject)
    GRAPH ?g {
     ?subject a ${sparqlEscapeUri(type)}.
    }
  }
  `;
  await update(updateDatePublishedQuery);
}

export async function getPublicServiceDetails(publishedInstanceSnaphotId) {
  //we make a intermediate data structure to ease posting to ldes endpoint
  const resultBindings = [];
  const publicServiceQuery = `
    ${prefixes}

    SELECT DISTINCT ?s ?p ?o {
      BIND(${sparqlEscapeUri(publishedInstanceSnaphotId)} as ?s)
      GRAPH ?g {
        ?s a lpdcExt:PublishedInstancePublicServiceSnapshot;
          ?p ?o.
      }
    }
  `;
  const queryResult = await query(publicServiceQuery);
  resultBindings.push(queryResult.results.bindings);

  const legalResourceQuery = `
    ${prefixes}
    CONSTRUCT {
        ?legalResourceId a eli:LegalResource;
          dct:title ?title;
          dct:description ?description;
          schema:url ?location;
          sh:order ?order.
    } WHERE {
        ${sparqlEscapeUri(publishedInstanceSnaphotId)} a lpdcExt:PublishedInstancePublicServiceSnapshot;
            m8g:hasLegalResource ?legalResourceId.
        ?legalResourceId a eli:LegalResource;
          schema:url ?location;
          sh:order ?order.

        OPTIONAL { ?legalResourceId dct:title ?title. }
        OPTIONAL { ?legalResourceId dct:description ?description. }
  }
  `
  const legalResourceData = await query(legalResourceQuery);
  resultBindings.push(legalResourceData.results.bindings);

  const evidenceQuery = `
    ${prefixes}
    CONSTRUCT {
     ?s a m8g:Evidence;
          dct:description ?description;
          dct:title ?name.
    }
    WHERE {
        ${sparqlEscapeUri(publishedInstanceSnaphotId)} a lpdcExt:PublishedInstancePublicServiceSnapshot;
          belgif:hasRequirement ?requirement.
        ?requirement a m8g:Requirement;
          m8g:hasSupportingEvidence ?s.

        ?s a m8g:Evidence;
          dct:description ?description;
          dct:title ?name.
    }`;
  const evidenceData = await query(evidenceQuery);
  resultBindings.push(evidenceData.results.bindings);

  const requirementQuery = `
  ${prefixes}
  CONSTRUCT {
        ?s a m8g:Requirement;
          dct:description ?description;
          m8g:hasSupportingEvidence ?hasSupportingEvidence;
          dct:title ?name;
          sh:order ?order.
      }
      WHERE {
        ${sparqlEscapeUri(publishedInstanceSnaphotId)} a lpdcExt:PublishedInstancePublicServiceSnapshot;
          belgif:hasRequirement ?s.
        ?s a m8g:Requirement;
          dct:description ?description;
          dct:title ?name;
          sh:order ?order.
        OPTIONAL{ ?s m8g:hasSupportingEvidence ?hasSupportingEvidence. }
      }`;
  const requirementData = await query(requirementQuery);
  resultBindings.push(requirementData.results.bindings);

  const websiteOnlineProcedureQuery = `
  ${prefixes}
  CONSTRUCT {
        ?s a schema:WebSite;
          dct:description ?description;
          schema:url ?location;
          dct:title ?name;
          sh:order ?order.

      }
      WHERE {
        ${sparqlEscapeUri(publishedInstanceSnaphotId)} a lpdcExt:PublishedInstancePublicServiceSnapshot;
          cpsv:follows ?rule.
        ?rule a cpsv:Rule;
          lpdcExt:hasWebsite ?s.

        ?s a schema:WebSite;
          schema:url ?location;
          dct:title ?name;
          sh:order ?order.

        OPTIONAL { ?s dct:description ?description. }

      }`;
  const websiteOnlineProcedureData = await query(websiteOnlineProcedureQuery);
  resultBindings.push(websiteOnlineProcedureData.results.bindings);

  const procedureQuery = `
  ${prefixes}
  CONSTRUCT {
        ?s a cpsv:Rule;
          lpdcExt:hasWebsite ?hasWebsite;
          dct:description ?description;
          dct:title ?name;
          sh:order ?order.
      }
      WHERE {
        ${sparqlEscapeUri(publishedInstanceSnaphotId)} a lpdcExt:PublishedInstancePublicServiceSnapshot;
          cpsv:follows ?s.
        ?s a cpsv:Rule;
          dct:description ?description;
          dct:title ?name;
          sh:order ?order.
        OPTIONAL { ?s lpdcExt:hasWebsite ?hasWebsite. }
      }`;

  const procedureData = await query(procedureQuery);
  resultBindings.push(procedureData.results.bindings);

  const costQuery = `
  ${prefixes}
      CONSTRUCT {
        ?s a m8g:Cost;
          dct:description ?description;
          dct:title ?name;
          sh:order ?order.
      }
      WHERE {
        ${sparqlEscapeUri(publishedInstanceSnaphotId)} a lpdcExt:PublishedInstancePublicServiceSnapshot;
          m8g:hasCost ?s.
         ?s a m8g:Cost;
          dct:description ?description;
          dct:title ?name;
          sh:order ?order.
      }`;
  const costData = await query(costQuery);
  resultBindings.push(costData.results.bindings);

  const financialAdvantageQuery = `
  ${prefixes}
      CONSTRUCT {
        ?s a lpdcExt:FinancialAdvantage;
          dct:description ?description;
          dct:title ?name;
          sh:order ?order.
      }
      WHERE {
        ${sparqlEscapeUri(publishedInstanceSnaphotId)} a lpdcExt:PublishedInstancePublicServiceSnapshot;
          cpsv:produces ?s.

       ?s a lpdcExt:FinancialAdvantage;
            dct:title ?name;
            dct:description ?description;
            sh:order ?order.
      }`;
  const financialAdvantageData = await query(financialAdvantageQuery);
  resultBindings.push(financialAdvantageData.results.bindings);

  const contactPointQuery = `
  ${prefixes}
       CONSTRUCT {
         ?s a schema:ContactPoint;
          lpdcExt:address ?address;
          schema:email ?hasEmail;
          schema:telephone ?hasTelephone;
          schema:openingHours ?openingHours;
          schema:url ?website;
          sh:order ?order.
        ?address a <http://www.w3.org/ns/locn#Address>;
          adres:postcode ?postcode;
          adres:Straatnaam ?streetname;
          adres:land ?country;
          adres:gemeentenaam ?municipality;
          adres:volledigAdres ?fullAdress;
          adres:Adresvoorstelling.huisnummer ?houseNumber;
          adres:Adresvoorstelling.busnummer ?mailbox;
          locn:adminUnitL2 ?administrativeUnitLevel2.
       }
      WHERE {
        ${sparqlEscapeUri(publishedInstanceSnaphotId)} a lpdcExt:PublishedInstancePublicServiceSnapshot;
          m8g:hasContactPoint ?s.
        ?s a schema:ContactPoint;
           sh:order ?order.

        OPTIONAL {
          ?s lpdcExt:address ?address.
            OPTIONAL { ?address adres:postcode ?postcode. }
            OPTIONAL { ?address adres:Straatnaam ?streetname. }
            OPTIONAL { ?address adres:land ?country. }
            OPTIONAL { ?address adres:gemeentenaam ?municipality. }
            OPTIONAL { ?address adres:volledigAdres ?fullAdress. }
            OPTIONAL { ?address adres:Adresvoorstelling.huisnummer ?houseNumber. }
            OPTIONAL { ?address adres:Adresvoorstelling.busnummer ?mailbox. }
            OPTIONAL { ?address locn:adminUnitL2 ?administrativeUnitLevel2. }
        }
        OPTIONAL { ?s schema:email ?hasEmail. }
        OPTIONAL { ?s schema:telephone ?hasTelephone. }
        OPTIONAL { ?s schema:url ?website. }
        OPTIONAL { ?s schema:openingHours ?openingHours. }
      }`;
  const contactPointData = await query(contactPointQuery);
  resultBindings.push(contactPointData.results.bindings);

  const websiteQuery = `
  ${prefixes}
      CONSTRUCT {
        ?s a schema:WebSite;
          dct:description ?description;
          schema:url ?location;
          dct:title ?name;
          sh:order ?order.
      }
      WHERE {
        ${sparqlEscapeUri(publishedInstanceSnaphotId)} a lpdcExt:PublishedInstancePublicServiceSnapshot;
          rdfs:seeAlso ?s.
        ?s a schema:WebSite;
          schema:url ?location;
          dct:title ?name;
          sh:order ?order.
        OPTIONAL { ?s dct:description ?description. }
      }`;
  const websiteData = await query(websiteQuery);
  resultBindings.push(websiteData.results.bindings);

  const tombStoneQuery = `
    ${prefixes}
    CONSTRUCT {
      ?s ?p ?o.
    }
    WHERE {
      BIND(${sparqlEscapeUri(publishedInstanceSnaphotId)} as ?s)

      VALUES ?p {
       <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>
       <https://www.w3.org/ns/activitystreams#formerType>
       <https://www.w3.org/ns/activitystreams#deleted>
       <https://productencatalogus.data.vlaanderen.be/ns/ipdc-lpdc#isPublishedVersionOf>
       <http://www.w3.org/ns/prov#generatedAtTime>
      }
      GRAPH ?g {
        ?s a as:Tombstone;
          as:formerType lpdcExt:InstancePublicService;
          ?p ?o.
      }
    }
  `;
  let tombStoneData = await query(tombStoneQuery);
  resultBindings.push(tombStoneData.results.bindings);

  const results = createResultObject(resultBindings);

  return results;
}

/*
 * Takes a list of bindings and returns a list of objects ready to be sent
 * Group the results by subject.
 * The triples to be published are bundled per subject, so everything gets properly versioned
 */
function createResultObject(bindingsList) {
  const resultObject = {};
  const bindings = bindingsList.flat();
  const uniqueSubjects = [...new Set(bindings.map(b => b.s.value))];
  for (const subject of uniqueSubjects) {
    const bindingsForSubject = bindings.filter(b => b.s.value === subject);
    resultObject[subject] = {
      body: bindingsToNT(bindingsForSubject).join('\r\n') + "\r\n"
    };
  }
  return resultObject;
}

export async function incrementRetryCounter(publishedServiceUri) {
  await update(`
    ${prefixes}
    DELETE {
      GRAPH ?g {
        ${sparqlEscapeUri(publishedServiceUri)} ext:publishRetryCount ?counter .
      }
    }
    INSERT {
      GRAPH ?g {
        ${sparqlEscapeUri(publishedServiceUri)} ext:publishRetryCount ?incrementedCounter .
      }
    }
    WHERE {
      GRAPH ?g {
        ${sparqlEscapeUri(publishedServiceUri)} ?p ?o .
        OPTIONAL {
          ${sparqlEscapeUri(publishedServiceUri)} ext:publishRetryCount ?counter .
        }
        BIND (COALESCE(?counter, 0)+1 AS ?incrementedCounter)
      }
    }
  `);
}
