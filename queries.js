import { prefixes } from "./prefixes";
import { sparqlEscapeUri } from 'mu';
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import { bindingsToNT } from "./utils/bindingsToNT";

//TODO:
// - add label STATUS_PUBLISHED_URI, with migration
export const STATUS_PUBLISHED_URI ="http://lblod.data.gift/concepts/3369bb10-1962-11ed-b07c-132292303e92";
export const STATUS_TO_REPUBLISH_URI ="http://lblod.data.gift/concepts/a7d01120-6f93-11ed-bcb8-a144c50c46d7";
const SENT_URI = "http://lblod.data.gift/concepts/9bd8d86d-bb10-4456-a84e-91e9507c374c";

/*
 * Poll data from any graphs
 */
export async function getServicesToPublish() {
   const queryString = `
    ${prefixes}
    SELECT DISTINCT ?publicservice WHERE {
     {
       GRAPH ?graph {
         ?publicservice a cpsv:PublicService;
           adms:status ${sparqlEscapeUri(SENT_URI)}.
       }
       FILTER NOT EXISTS{
        ?publicservice schema:publication ${sparqlEscapeUri(STATUS_PUBLISHED_URI)}.
       }
     }
     UNION {
        GRAPH ?graph {
         ?publicservice a cpsv:PublicService;
           adms:status ${sparqlEscapeUri(SENT_URI)};
           schema:publication ${sparqlEscapeUri(STATUS_TO_REPUBLISH_URI)}.
       }
     }
     UNION {
       GRAPH ?graph {
         ?publicservice a as:Tombstone;
         as:formerType cpsv:PublicService;
         schema:publication ${sparqlEscapeUri(STATUS_TO_REPUBLISH_URI)}.
       }
     }
   }
  `;
  const result = (await query(queryString)).results.bindings;
  return result;
};

/*
 * update the status of posted data.
 */
export async function updateStatusPublicService(uri, status) {
  const statusUpdate = `
  ${prefixes}

  DELETE {
    GRAPH ?g {
     ?subject schema:publication ?publicationStatus.
    }
  }
  INSERT {
    GRAPH ?g {
      ?service schema:publication ${sparqlEscapeUri(status)}.
    }
  }
  WHERE {
    BIND(${sparqlEscapeUri(uri)} as ?subject)
    GRAPH ?g {
     ?subject schema:publication ?publicationStatus.
    }
  }
  `;
  await update(statusUpdate);
};


export async function getPublicServiceDetails( publicServiceUri ) {
  //we make a intermediate data structure to ease posting to ldes endpoint
  const resultBindings = [];

  const publicServiceQuery = `
    ${prefixes}

    SELECT DISTINCT ?s ?p ?o {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?s)
      GRAPH ?g {
        ?s a cpsv:PublicService;
          ?p ?o.
      }
    }
  `;
  const queryResult = await query(publicServiceQuery);
  resultBindings.push(queryResult.results.bindings);

  const evidenceQuery = `
    ${prefixes}
    CONSTRUCT {
     ?s a m8g:Evidence;
          dct:description ?description;
          dct:title ?name.
    }
    WHERE {
        ${sparqlEscapeUri(publicServiceUri)} a cpsv:PublicService;
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
          dct:title ?name.
      }
      WHERE {
        ${sparqlEscapeUri(publicServiceUri)} a cpsv:PublicService;
          belgif:hasRequirement ?s.
        ?s a m8g:Requirement;
          dct:description ?description;
          dct:title ?name.
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
          dct:title ?name.
      }
      WHERE {
        ${sparqlEscapeUri(publicServiceUri)} a cpsv:PublicService;
          cpsv:follows ?rule.
        ?rule a cpsv:Rule;
          lpdcExt:hasWebsite ?s.

        ?s a schema:WebSite;
          schema:url ?location;
          dct:title ?name.

        OPTIONAL { ?s dct:description ?description. }

      }`;
  const websiteOnlineProcedureData = await query(websiteOnlineProcedureQuery);
  resultBindings.push(websiteOnlineProcedureData.results.bindings);

  const procedureQuery = `
  ${prefixes}
  CONSTRUCT {
        ?s a cpsv:Rule;
          lpdcExt:hasWebsites ?hasWebsites;
          dct:description ?description;
          dct:title ?name.
      }
      WHERE {
        ${sparqlEscapeUri(publicServiceUri)} a cpsv:PublicService;
          cpsv:follows ?s.
        ?s a cpsv:Rule;
          dct:description ?description;
          dct:title ?name.
        OPTIONAL { ?s lpdcExt:hasWebsite ?hasWebsites. }
      }`;

  const procedureData = await query(procedureQuery);
  resultBindings.push(procedureData.results.bindings);

  const costQuery = `
  ${prefixes}
      CONSTRUCT {
        ?s a m8g:Cost;
          dct:description ?description;
          dct:title ?name.
      }
      WHERE {
        ${sparqlEscapeUri(publicServiceUri)} a cpsv:PublicService;
          m8g:hasCost ?s.
         ?s a m8g:Cost;
          dct:description ?description;
          dct:title ?name.
      }`;
  const costData = await query(costQuery);
  resultBindings.push(costData.results.bindings);

  const financialAdvantageQuery = `
  ${prefixes}
      CONSTRUCT {
        ?s a lpdcExt:FinancialAdvantage;
          dct:description ?description;
          dct:title ?name.
      }
      WHERE {
        ${sparqlEscapeUri(publicServiceUri)} a cpsv:PublicService;
          cpsv:produces ?s.

       ?s a lpdcExt:FinancialAdvantage;
            dct:title ?name.
       OPTIONAL { ?s dct:description ?description. }

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
          schema:url ?website.
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
        ${sparqlEscapeUri(publicServiceUri)} a cpsv:PublicService;
          m8g:hasContactPoint ?s.
         ?s a schema:ContactPoint.

        OPTIONAL { ?s lpdcExt:address ?address. }
        OPTIONAL { ?s schema:email ?hasEmail. }
        OPTIONAL { ?s schema:telephone ?hasTelephone. }
        OPTIONAL { ?s schema:openingHours ?openingHours. }
        OPTIONAL { ?s schema:url ?website. }
        OPTIONAL { ?address adres:postcode ?postcode. }
        OPTIONAL { ?address adres:Straatnaam ?streetname. }
        OPTIONAL { ?address adres:land ?country. }
        OPTIONAL { ?address adres:gemeentenaam ?municipality. }
        OPTIONAL { ?address adres:volledigAdres ?fullAdress. }
        OPTIONAL { ?address adres:Adresvoorstelling.huisnummer ?houseNumber. }
        OPTIONAL { ?address adres:Adresvoorstelling.busnummer ?mailbox. }
        OPTIONAL { ?address locn:adminUnitL2 ?administrativeUnitLevel2. }

      }`;
  const contactPointData = await query(contactPointQuery);
  resultBindings.push(contactPointData.results.bindings);

  const documentQuery = `
  ${prefixes}
      CONSTRUCT {
         ?s a foaf:Document;
          dct:description ?description;
          schema:url ?document;
          dct:title ?title.
      }
      WHERE {
         ${sparqlEscapeUri(publicServiceUri)} a cpsv:PublicService;
          lpdcExt:attachment ?s.
         ?s a foaf:Document;
          dct:description ?description;
          schema:url ?document;
          dct:title ?title.
      }`;
  const documentData = await query(documentQuery);
  resultBindings.push(documentData.results.bindings);

  const websiteQuery = `
  ${prefixes}
      CONSTRUCT {
        ?s a schema:WebSite;
          dct:description ?description;
          schema:url ?location;
          dct:title ?name.
      }
      WHERE {
        ${sparqlEscapeUri(publicServiceUri)} a cpsv:PublicService;
          rdfs:seeAlso ?s.
        ?s a schema:WebSite;
          schema:url ?location;
          dct:title ?name.
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
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?s)

      VALUES ?p {
       <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>
       <https://www.w3.org/ns/activitystreams#formerType>
       <https://www.w3.org/ns/activitystreams#deleted>
      }
      GRAPH ?g {
        ?s a as:Tombstone;
          as:formerType cpsv:PublicService;
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
 * takes a service object and returns if it has been published
 */
export async function isPublishedService(service){
  // Note: the extra check on tombstone,
  //   is because service can be deleted before delta gets processed
  const conceptUri = "http://lblod.data.gift/concepts/79a52da4-f491-4e2f-9374-89a13cde8ecd";
  const queryString = `
    ${prefixes}
    ASK {
      {
        ${sparqlEscapeUri(service)}
          a cpsv:PublicService ;
          adms:status ${sparqlEscapeUri(conceptUri)};
          schema:publication ${sparqlEscapeUri(STATUS_PUBLISHED_URI)} .
      }
      UNION {
        ${sparqlEscapeUri(service)} a as:Tombstone;
            as:formerType cpsv:PublicService;
            schema:publication ${sparqlEscapeUri(STATUS_PUBLISHED_URI)} .
        }
    }`;
  const queryData = await query( queryString );
  return queryData.boolean;
}

/*
 * Takes a list of bindings and returns a list of objects ready to be sent
 * Group the results by subject.
 * The triples to be published are bundled per suject, so everything gets properly versioned
 */
function createResultObject(bindingsList) {
  const  resultObject = {};
  for(let bindings of bindingsList) {
    const uniqueSubjects = [ ...new Set(bindings.map(b => b.s.value)) ];
    for(const subject of uniqueSubjects) {
      const bindingsForSubject = bindings.filter(b => b.s.value == subject);
      resultObject[subject] = {
        body: bindingsToNT(bindingsForSubject).join('\r\n')+"\r\n"
      };
    }
  }
  return resultObject;
}
