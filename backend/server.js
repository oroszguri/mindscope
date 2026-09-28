import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";

const app = express();

const PORT = process.env.PORT || 10000;

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://orozsguri.github.io";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(
    cors({
        origin: FRONTEND_URL
    })
);


/*
|--------------------------------------------------------------------------
| Kép feltöltés memóriába
|--------------------------------------------------------------------------
|
| A képet nem mentjük le lemezre.
| Csak a kérés idejére tartjuk memóriában.
|
*/

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 8 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!allowed.includes(file.mimetype)) {
            return cb(
                new Error(
                    "Csak JPG, PNG vagy WEBP kép engedélyezett."
                )
            );
        }

        cb(null, true);
    }
});


/*
|--------------------------------------------------------------------------
| Teszt endpoint
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {

    res.json({
        status: "ok",
        message: "MindScope AI backend működik."
    });

});


/*
|--------------------------------------------------------------------------
| AI képelemzés
|--------------------------------------------------------------------------
*/

app.post(
    "/api/analyze-image",
    upload.single("image"),

    async (req, res) => {

        try {

            if (!req.file) {

                return res.status(400).json({
                    error: "Nem érkezett kép."
                });

            }


            /*
             * A feltöltött képet base64 Data URL-lé alakítjuk.
             */

            const base64 =
                req.file.buffer.toString("base64");

            const imageDataUrl =
                `data:${req.file.mimetype};base64,${base64}`;


            /*
             * OpenAI Vision kérés
             */

            const response =
                await openai.responses.create({

                    model: "gpt-5-mini",

                    input: [

                        {
                            role: "developer",

                            content: [
                                {
                                    type: "input_text",

                                    text: `
Te egy óvatos, önismereti célú
vizuális asszisztens vagy.

A képet csak semleges vizuális
jellemzők leírására használd.

NE diagnosztizálj mentális betegséget.

NE állítsd, hogy a személy depressziós,
szorongó, bipoláris, pszichotikus vagy
bármilyen más mentális állapotban van.

NE próbáld biztosan meghatározni a személy
érzelmi vagy mentális állapotát kizárólag
a fénykép alapján.

Írd le röviden:
- milyen a kép hangulata vizuális értelemben,
- milyen fényviszonyok vannak,
- milyen színek dominálnak,
- milyen környezet látható,
- milyen semleges, látható arckifejezési
  vagy testtartási jellemzők figyelhetők meg,
  ha ezek egyértelműen láthatók.

Használj bizonytalan megfogalmazást,
például "úgy tűnik", "látható", "a kép alapján".

A válasz végén mondd el:
"A fénykép önmagában nem alkalmas
pszichológiai vagy érzelmi állapot
megbízható megállapítására."
`
                                }
                            ]
                        },

                        {
                            role: "user",

                            content: [

                                {
                                    type: "input_text",

                                    text: `
Elemezd ezt a képet semleges,
önismereti szempontból.
`
                                },

                                {
                                    type: "input_image",

                                    image_url: imageDataUrl,

                                    detail: "low"
                                }

                            ]
                        }

                    ]
                });


            /*
             * Válasz elküldése a frontendnek
             */

            res.json({

                success: true,

                description:
                    response.output_text

            });

        }

        catch (error) {

            console.error(
                "AI ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                error:
                    "Az AI képelemzése nem sikerült."

            });

        }

    }
);


/*
|--------------------------------------------------------------------------
| Hibakezelés
|--------------------------------------------------------------------------
*/

app.use(
    (error, req, res, next) => {

        console.error(error);

        res.status(400).json({

            error:
                error.message ||
                "Ismeretlen hiba."

        });

    }
);


/*
|--------------------------------------------------------------------------
| Server indítása
|--------------------------------------------------------------------------
*/

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `MindScope backend running on port ${PORT}`
        );

    }
);

