/**
 * Vercel Node.js Serverless Function — Operações eSocial
 * Assina XML com certificado A1 (PFX/P12) e envia para a API REST do eSocial.
 *
 * POST /api/esocial-operacoes
 * Body JSON: { acao, xmlString?, pfxBase64, pfxSenha, tpAmb?, protocolo?, cnpj? }
 *
 * Ações:
 *   validarCert  → verifica o PFX e retorna { nome, cnpj, validade }
 *   assinar      → assina o xmlString e retorna { xml }
 *   enviar       → assina + empacota + envia ao eSocial; retorna { protocolo, cdResposta, descResposta }
 *   consultar    → consulta status de um lote pelo protocolo; retorna { data }
 */

import forge from "node-forge";
import { createHash, createSign } from "node:crypto";
import https from "node:https";
import { Buffer } from "node:buffer";

export const config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
};

const URLS = {
  envio_hom:      "https://api.esocial.gov.br/hom/api/envio/lote/eventos/empregador/v1/",
  envio_prod:     "https://api.esocial.gov.br/prod/api/envio/lote/eventos/empregador/v1/",
  consulta_hom:   "https://api.esocial.gov.br/hom/api/consulta/lote/resultado/v1/",
  consulta_prod:  "https://api.esocial.gov.br/prod/api/consulta/lote/resultado/v1/",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ erro: "Método não permitido" }); return; }

  const { acao, xmlString, pfxBase64, pfxSenha, tpAmb = "2", protocolo, cnpj } = req.body || {};

  try {
    // ── Validar certificado ───────────────────────────────────────────────
    if (acao === "validarCert") {
      if (!pfxBase64) { res.status(400).json({ erro: "PFX não enviado" }); return; }
      const info = extrairInfoCert(pfxBase64, pfxSenha);
      res.status(200).json({ ok: true, ...info });
      return;
    }

    // ── Apenas assinar o XML ──────────────────────────────────────────────
    if (acao === "assinar") {
      if (!xmlString || !pfxBase64) { res.status(400).json({ erro: "Parâmetros faltando" }); return; }
      const xml = assinarXml(xmlString, pfxBase64, pfxSenha);
      res.status(200).json({ ok: true, xml });
      return;
    }

    // ── Assinar + empacotar + enviar ──────────────────────────────────────
    if (acao === "enviar") {
      if (!xmlString || !pfxBase64) { res.status(400).json({ erro: "Parâmetros faltando" }); return; }
      const cnpjEmpresa = cnpj || extrairCnpjDoXml(xmlString);
      const xmlAssinado = assinarXml(xmlString, pfxBase64, pfxSenha);
      const loteXml     = empacotar(xmlAssinado, cnpjEmpresa);
      const pfxBuf      = Buffer.from(pfxBase64, "base64");
      const url         = tpAmb === "1" ? URLS.envio_prod : URLS.envio_hom;
      const resp        = await httpsPost(url, loteXml, pfxBuf, pfxSenha);
      const protocRet   = extrairTag(resp.data, "protocoloEnvio");
      const cdResp      = extrairTag(resp.data, "cdResposta");
      const descResp    = extrairTag(resp.data, "descResposta");
      res.status(200).json({
        ok:           cdResp === "201",
        protocolo:    protocRet,
        cdResposta:   cdResp,
        descResposta: descResp,
        rawResponse:  resp.data,
      });
      return;
    }

    // ── Consultar status de lote ──────────────────────────────────────────
    if (acao === "consultar") {
      if (!protocolo || !pfxBase64) { res.status(400).json({ erro: "Parâmetros faltando" }); return; }
      const pfxBuf = Buffer.from(pfxBase64, "base64");
      const url    = (tpAmb === "1" ? URLS.consulta_prod : URLS.consulta_hom) + protocolo;
      const resp   = await httpsGet(url, pfxBuf, pfxSenha);
      res.status(200).json({ ok: true, data: resp.data, status: resp.status });
      return;
    }

    res.status(400).json({ erro: `Ação desconhecida: ${acao}` });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

// ── Extrai info do certificado sem enviar ao eSocial ─────────────────────────
function extrairInfoCert(pfxBase64, pfxSenha) {
  const { cert } = parsePfx(pfxBase64, pfxSenha);
  const subj     = cert.subject.getField("CN");
  const cnpjAttr = cert.subject.getField("OU") || cert.subject.getField("serialNumber");
  const validade = cert.validity.notAfter.toISOString().slice(0, 10);
  return {
    nome:    subj?.value || "(sem nome)",
    cnpj:    cnpjAttr?.value || "",
    validade,
    expirado: new Date() > cert.validity.notAfter,
  };
}

// ── Parse do PFX e extração de cert + key ────────────────────────────────────
function parsePfx(pfxBase64, pfxSenha) {
  const pfxDer  = forge.util.decode64(pfxBase64);
  const p12Asn1 = forge.asn1.fromDer(pfxDer);
  const p12     = forge.pkcs12.pkcs12FromAsn1(p12Asn1, pfxSenha || "");

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
  const keyBags  = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || [];

  if (!certBags.length) throw new Error("Certificado não encontrado no arquivo PFX");
  if (!keyBags.length)  throw new Error("Chave privada não encontrada no arquivo PFX. Verifique se a senha está correta.");

  return { cert: certBags[0].cert, key: keyBags[0].key };
}

// ── Assina o XML com xmldsig enveloped (RSA-SHA256) ──────────────────────────
function assinarXml(xmlStr, pfxBase64, pfxSenha) {
  const { cert, key } = parsePfx(pfxBase64, pfxSenha);

  // Certificado em DER→base64 (para o KeyInfo)
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const certB64 = forge.util.encode64(certDer);

  // Chave privada em PEM para node:crypto
  const privKeyPem = forge.pki.privateKeyToPem(key);

  // Id do evento para o Reference URI
  const idMatch = xmlStr.match(/\sId="([^"]+)"/);
  const evtId   = idMatch ? idMatch[1] : "";

  // Digest SHA-256 do documento (sem Signature — ainda não inserido)
  const digest = createHash("sha256").update(xmlStr, "utf8").digest("base64");

  // SignedInfo em formato canonical
  const signedInfoXml =
    `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>` +
    `<Reference URI="${evtId ? "#" + evtId : ""}">` +
    `<Transforms>` +
    `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
    `<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `</Transforms>` +
    `<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
    `<DigestValue>${digest}</DigestValue>` +
    `</Reference>` +
    `</SignedInfo>`;

  // Assina o SignedInfo com RSA-SHA256
  const signer = createSign("RSA-SHA256");
  signer.update(signedInfoXml, "utf8");
  const sigValue = signer.sign(privKeyPem, "base64");

  // Elemento Signature completo
  const sigEl =
    `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    signedInfoXml +
    `<SignatureValue>${sigValue}</SignatureValue>` +
    `<KeyInfo><X509Data><X509Certificate>${certB64}</X509Certificate></X509Data></KeyInfo>` +
    `</Signature>`;

  // Insere antes de </eSocial>
  return xmlStr.replace("</eSocial>", `  ${sigEl}\n</eSocial>`);
}

// ── Empacota o evento assinado em um lote eSocial ────────────────────────────
function empacotar(signedXml, cnpjEmpresa) {
  const cnpj14 = (cnpjEmpresa || "").replace(/\D/g, "").padStart(14, "0");
  const evId   = `ev${Date.now()}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/v1_1_1">
  <envioLoteEventos grupo="1">
    <ideEmpregador><tpInsc>1</tpInsc><nrInsc>${cnpj14}</nrInsc></ideEmpregador>
    <ideTransmissor><tpInsc>1</tpInsc><nrInsc>${cnpj14}</nrInsc></ideTransmissor>
    <eventos>
      <evento Id="${evId}">
${signedXml}
      </evento>
    </eventos>
  </envioLoteEventos>
</eSocial>`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function extrairTag(xml, tag) {
  const m = (xml || "").match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1] : "";
}

function extrairCnpjDoXml(xml) {
  const m = (xml || "").match(/<nrInsc>(\d{14})<\/nrInsc>/);
  return m ? m[1] : "00000000000000";
}

function httpsPost(url, body, pfxBuf, passphrase) {
  return new Promise((resolve, reject) => {
    const u       = new URL(url);
    const bodyBuf = Buffer.from(body, "utf-8");
    const req = https.request({
      hostname:          u.hostname,
      path:              u.pathname + u.search,
      method:            "POST",
      headers:           { "Content-Type": "application/xml;charset=UTF-8", "Content-Length": bodyBuf.length },
      pfx:               pfxBuf,
      passphrase,
      rejectUnauthorized: false,
    }, (res) => {
      let data = "";
      res.on("data", c => { data += c; });
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.on("error", reject);
    req.write(bodyBuf);
    req.end();
  });
}

function httpsGet(url, pfxBuf, passphrase) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname:          u.hostname,
      path:              u.pathname,
      method:            "GET",
      pfx:               pfxBuf,
      passphrase,
      rejectUnauthorized: false,
    }, (res) => {
      let data = "";
      res.on("data", c => { data += c; });
      res.on("end", () => resolve({ status: res.statusCode, data }));
    });
    req.on("error", reject);
    req.end();
  });
}
