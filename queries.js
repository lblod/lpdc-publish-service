import { prefixes } from "./prefixes";
import { sparqlEscapeUri } from 'mu';
import { querySudo as query } from "@lblod/mu-auth-sudo";
import { bindingsToNT } from "./utils/bindingsToNT";

//TODO:
// - add label STATUS_PUBLISHED_URI, with migration
const STATUS_PUBLISHED_URI ="http://lblod.data.gift/concepts/3369bb10-1962-11ed-b07c-132292303e92";
const SENT_URI = "http://lblod.data.gift/concepts/9bd8d86d-bb10-4456-a84e-91e9507c374c";

/*
 * Poll data from any graphs
 */
export async function getUnpublishedServices() {
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
 * TODO: move to queries
 * update the status of posted data.
 */
export async function updateStatusPublicService(uri) {
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



export async function getPublicServiceDetails( publicServiceUri ) {
  //we make a intermediate data structure to ease posting to ldes endpoint
  const results = [];
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
  const publicServiceBody = bindingsToNT(queryResult.results.bindings).join("\r\n");

  results.push(
    {
      subject: publicServiceUri,
      body: publicServiceBody,
    }
  );

  const evidenceQuery = `
    ${prefixes}
    CONSTRUCT {
     ?evidence a m8g:Evidence;
          ?p ?o.
    }
    WHERE {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          belgif:hasRequirement ?requirement.
        ?requirement a m8g:Requirement;
          m8g:hasSupportingEvidence ?evidence.
        ?evidence a m8g:Evidence;
          ?p ?o.
    }`;

  const evidenceData = await query(evidenceQuery);

  const requirementQuery = `
  ${prefixes}
  CONSTRUCT {
        ?s a m8g:Requirement;
          ?p ?o.
      }
      WHERE {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          belgif:hasRequirement ?s.
        ?s a m8g:Requirement;
          ?p ?o.
      }`;
  const requirementData = await query(requirementQuery);

  const websiteOnlineProcedureQuery = `
  ${prefixes}
  CONSTRUCT {
        ?s a schema:Website;
          ?p ?o.
      }`;
  const requirementData = await query(requirementQuery);

  const websiteOnlineProcedureQuery = `
  ${prefixes}
  CONSTRUCT {
        ?s a schema:Website;
          ?p ?o.
      }
      WHERE {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          cpsv:follows ?rule.
        ?rule a cpsv:Rule;
          lpdcExt:hasOnlineProcedure ?s.
        ?s a schema:Website;
          ?p ?o.
      }`;
  const websiteOnlineProcedureData = await query(websiteOnlineProcedureQuery);

  const procedureQuery = `
  ${prefixes}
  CONSTRUCT {
        ?s a cpsv:Rule;
          ?p ?o.
      }
      WHERE {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          cpsv:follows ?s.
        ?s a cpsv:Rule;
          ?p ?o.
      }`
  const procedureData = await query(procedureQuery);


  const costQuery = `
  ${prefixes}
      CONSTRUCT {
        ?s a m8g:Cost;
          ?p ?o.
      }
      WHERE {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          m8g:hasCost ?s.
         ?s a m8g:Cost;
          ?p ?o.
      }`;
  const costData = await query(costQuery);


  const financialAdvantageQuery = `
  ${prefixes}
      CONSTRUCT {
        ?s a lpdcExt:FinancialAdvantage;
          ?p ?o.
      }
      WHERE {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          cpsv:produces ?s.
         ?s a lpdcExt:FinancialAdvantage;
          ?p ?o.
      }`;
  const financialAdvantageData = await query(financialAdvantageQuery);


  const contactPointQuery = `
  ${prefixes}
       CONSTRUCT {
         ?s a schema:ContactPoint;
          ?p ?o.
       }
      WHERE {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          m8g:hasContactPoint ?s.
         ?s a schema:ContactPoint;
          ?p ?o.
      }`;
  const contactPointData = await query(contactPointQuery);

  const documentQuery = `
  ${prefixes}
      CONSTRUCT {
         ?s a foaf:Document;
          ?p ?o.
      }
      WHERE {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          lpdcExt:attachment ?s.
         ?s a foaf:Document;
          ?p ?o.
      }`;
  const documentData = await query(documentQuery);



  const websiteQuery = `
  ${prefixes}
      CONSTRUCT {
        ?s a schema:Website;
          ?p ?o.
      }`;
  const documentData = await query(documentQuery);



  const websiteQuery = `
  ${prefixes}
      CONSTRUCT {
        ?s a schema:Website;
          ?p ?o.
      }
      WHERE {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          rdfs:seeAlso ?s.
        ?s a schema:Website;
          ?p ?o.
      }`;
  const websiteData = await query(websiteQuery);

  // get the remaining data
  const relationQuery = "";

  const relationsResult = await query(relationQuery);

  //some mediocre post postprocessing to extract all unique subjects
  const relatedSubjects = [ ...new Set(relationsResult.results.bindings.map(result => result.s.value)) ];

  const relationsBody = bindingsToNT(relationsResult.results.bindings).join("\r\n");

  for(const subject of relatedSubjects) {
    results.push({
      subject,
      //TODO: this will send every time the same body again, with a different resource to process. this is suboptimal
      body: relationsBody,
    });
  }

  return results;
}
