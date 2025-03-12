/*************************************************
  server.js
  -----------------------------------------------
  Exemple de serveur Node.js (Express) qui :
   1) Lit les variables d'environnement
      (FIGMA_TOKEN, FIGMA_FILE_KEY, FIGMA_NODE_ID)
   2) Reçoit un POST /generate avec des placeholders
      (ex: {distance: "1000", day: "Lundi"})
   3) Appelle l'API Figma pour récupérer un SVG
   4) Remplace les placeholders dans ce SVG
   5) Convertit le SVG en PNG (sharp)
   6) Renvoie le PNG binaire en réponse
**************************************************/

// 1) IMPORTS
const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch"); // ou "axios"
const sharp = require("sharp");

// 2) VARIABLES D'ENVIRONNEMENT
//    Vous définirez FIGMA_TOKEN, FIGMA_FILE_KEY, FIGMA_NODE_ID
//    dans Render ou un autre hébergeur.
const figmaToken = process.env.FIGMA_TOKEN;
const fileKey = process.env.FIGMA_FILE_KEY;
const nodeId = process.env.FIGMA_NODE_ID;

// 3) CONFIG EXPRESS
const app = express();
app.use(bodyParser.json()); // Pour parser le body JSON

/*************************************************
  ROUTE : POST /generate
  -----------------------------------------------
  Le client (Airtable, Zapier, etc.) fait un POST
  avec un JSON comme : {
    "distance": "1000",
    "day": "Lundi"
  }

  On va :
   - Récupérer le SVG depuis Figma (API),
   - Remplacer {{distance}}, {{day}} dans le SVG,
   - Convertir en PNG,
   - Renvoyer l'image.
**************************************************/
app.post("/generate", async (req, res) => {
  try {
    // (A) RÉCUPÉRER LES INFORMATIONS
    //  - A)1. Variables d'env pour Figma
    //  - A)2. Placeholders depuis req.body (ex: req.body.distance)

    console.log("Figma Token:", figmaToken);
    console.log("File key:", fileKey);
    console.log("Node ID:", nodeId);

    // Les placeholders : distance, day, etc.
    console.log("Received placeholders in body:", req.body);

    // (B) APPELER L'API FIGMA POUR EXPORTER LE SVG
    const figmaUrl = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=svg`;
    let responseFigma = await fetch(figmaUrl, {
      headers: {
        "X-Figma-Token": figmaToken
      }
    });

    if (!responseFigma.ok) {
      throw new Error(`Figma API error: ${responseFigma.status} - ${responseFigma.statusText}`);
    }

    let dataFigma = await responseFigma.json();
    let svgDownloadUrl = dataFigma.images[nodeId];
    if (!svgDownloadUrl) {
      throw new Error("Figma n'a pas retourné d'URL pour ce nodeId.");
    }

    // (C) TÉLÉCHARGER LE SVG
    let svgResponse = await fetch(svgDownloadUrl);
    if (!svgResponse.ok) {
      throw new Error(`Erreur de téléchargement du SVG: ${svgResponse.status}`);
    }
    let svgText = await svgResponse.text();

    // (D) REMPLACER LES PLACEHOLDERS
    // Ex: on prend chaque clé de req.body et on cherche {{cle}} dans le SVG
    for (const [key, val] of Object.entries(req.body)) {
      // Par ex, si key = "distance", val = "1000", on remplace {{distance}}
      const placeholder = `{{${key}}}`;
      let regex = new RegExp(placeholder, "g");
      svgText = svgText.replace(regex, val);
    }

    // (E) CONVERTIR LE SVG EN PNG AVEC SHARP
    let pngBuffer = await sharp(Buffer.from(svgText)).png().toBuffer();

    // (F) ENVOYER LA RÉPONSE (PNG BINAIRE)
    // Content-Type = image/png pour que le client sache que c'est une image
    res.set("Content-Type", "image/png");
    res.send(pngBuffer);

  } catch (err) {
    console.error("Erreur /generate:", err);
    res.status(500).send(err.toString());
  }
});

/*************************************************
  LANCER LE SERVEUR
  (Render utilisera la variable PORT, sinon 3000)
**************************************************/
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
