async function legalAcceptance(api, apiUrl) {
  const response = await api.get(`${apiUrl}/legal/documentos/vigentes`);
  if (response.status() !== 200) throw new Error(`Falta publicar documentos legales aprobados: GET vigentes responde ${response.status()}. No sembrar aprobaciones falsas para ejecutar E2E.`);
  const { documentos } = await response.json();
  if (documentos?.length !== 2) throw new Error('Contrato legal incompleto.');
  return documentos.map((doc) => ({ documento_legal_id: doc.id, version: doc.version, aceptado: true }));
}
module.exports = { legalAcceptance };
