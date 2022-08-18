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

  const resultBindings=[];
  const evidenceQuery = `
    ${prefixes}
    CONSTRUCT {
     ?s a m8g:Evidence;
          dct:description ?description;
          dct:title ?name.
    }
    WHERE {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
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
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          belgif:hasRequirement ?s.
        ?s a m8g:Requirement;
          dct:description ?description;
          m8g:hasSupportingEvidence ?hasSupportingEvidence;
          dct:title ?name.
      }`;
  const requirementData = await query(requirementQuery);
  resultBindings.push(requirementData.results.bindings);

  const websiteOnlineProcedureQuery = `
  ${prefixes}
  CONSTRUCT {
        ?s a schema:Website;
          dct:description ?description;
          schema:url ?location;
          dct:title ?name.
      }
      WHERE {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          cpsv:follows ?rule.
        ?rule a cpsv:Rule;
          lpdcExt:hasWebsite ?s.
        ?s a schema:Website;
          dct:description ?description;
          schema:url ?location;
          dct:title ?name.
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
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          cpsv:follows ?s.
        ?s a cpsv:Rule;
          lpdcExt:hasWebsites ?hasWebsites;
          dct:description ?description;
          dct:title ?name.
      }`
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
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
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
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          cpsv:produces ?s.
         ?s a lpdcExt:FinancialAdvantage;
          dct:description ?description;
          dct:title ?name.
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
       }
      WHERE {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          m8g:hasContactPoint ?s.
         ?s a schema:ContactPoint;
          lpdcExt:address ?address;
          schema:email ?hasEmail;
          schema:telephone ?hasTelephone;
          schema:openingHours ?openingHours;
          schema:url ?website.
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
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
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
        ?s a schema:Website;
          dct:description ?description;
          schema:url ?location;
          dct:title ?name.
      }
      WHERE {
      BIND(${sparqlEscapeUri(publicServiceUri)} as ?service)
        ?service a cpsv:PublicService;
          rdfs:seeAlso ?s.
        ?s a schema:Website;
          dct:description ?description;
          schema:url ?location;
          dct:title ?name.
      }`;
  const websiteData = await query(websiteQuery);
  resultBindings.push(websiteData.results.bindings);

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
