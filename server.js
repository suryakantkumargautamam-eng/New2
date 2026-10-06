const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;

const GOOGLE_REVIEW_URL =
  "https://g.page/r/CRDpyce9iCusEBM/review";

const problems = [
  "Back Pain Treatment",
  "Neck Pain Treatment",
  "Knee Pain Treatment",
  "Sciatica Treatment",
  "Frozen Shoulder Treatment",
  "Stroke Rehabilitation",
  "Paralysis Rehabilitation",
  "Post Surgery Rehabilitation",
  "Neurological Physiotherapy",
  "Orthopedic Physiotherapy",
  "Sports Injury Rehabilitation",
  "Elderly Care Physiotherapy"
];

const experiences = {
  improvement: {
    en: "I noticed improvement in my condition",
    hi: "Mujhe apni condition mein improvement mehsoos hui"
  },
  movement: {
    en: "My movement became better",
    hi: "Meri movement better hui"
  },
  pain: {
    en: "My pain or discomfort improved",
    hi: "Mera pain ya discomfort kam hua"
  },
  explanation: {
    en: "Exercises were explained clearly",
    hi: "Exercises clearly samjhaye gaye"
  },
  professional: {
    en: "The treatment felt professional",
    hi: "Treatment professional laga"
  },
  communication: {
    en: "Communication was good",
    hi: "Communication achhi thi"
  },
  patient: {
    en: "The therapist was patient and supportive",
    hi: "Therapist patient aur supportive the"
  },
  guidance: {
    en: "I received proper guidance during exercises",
    hi: "Exercises ke dauran proper guidance mili"
  }
};

const dataFile = path.join(__dirname, "cortexus-reviews.json");

function loadUsedReviews() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    return {};
  }
}

function saveUsedReviews(data) {
  fs.writeFileSync(
    dataFile,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

function generateReview(problem, selectedExperiences, language) {

  const lines = selectedExperiences
    .map(key => experiences[key]?.[language])
    .filter(Boolean);

  if (language === "hi") {

    const openings = [
      `CORTEXUS mein ${problem} ke liye mera experience achha raha.`,
      `${problem} ke treatment ke liye CORTEXUS ke saath mera experience positive raha.`,
      `CORTEXUS ki physiotherapy service se ${problem} ke treatment mein mujhe achha experience mila.`,
      `Mere ${problem} ke treatment ke dauran CORTEXUS ka experience helpful raha.`
    ];

    const opening =
      openings[Math.floor(Math.random() * openings.length)];

    return `${opening} ${lines.join(". ")}. Overall, mujhe treatment aur guidance achhi lagi.`;
  }

  const openings = [
    `I had a good experience with CORTEXUS for ${problem}.`,
    `My experience with CORTEXUS for ${problem} was positive.`,
    `CORTEXUS provided a good physiotherapy experience for my ${problem}.`,
    `I was happy with my physiotherapy experience at CORTEXUS for ${problem}.`,
    `The physiotherapy experience at CORTEXUS for ${problem} was helpful.`
  ];

  const opening =
    openings[Math.floor(Math.random() * openings.length)];

  return `${opening} ${lines.join(". ")}. Overall, I was satisfied with the treatment and guidance.`;
}
function sendJSON(res, status, data) {

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  });

  res.end(JSON.stringify(data));
}

function serveFile(res, filePath, contentType) {

  try {

    const file = fs.readFileSync(filePath);

    res.writeHead(200, {
      "Content-Type": contentType
    });

    res.end(file);

  } catch (error) {

    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });

    res.end("File not found");

  }
}

const server = http.createServer((req, res) => {

  const requestUrl = new URL(
    req.url,
    `http://${req.headers.host || "localhost"}`
  );

  // Home page
  if (
    req.method === "GET" &&
    requestUrl.pathname === "/"
  ) {

    return serveFile(
      res,
      path.join(__dirname, "public", "index.html"),
      "text/html; charset=utf-8"
    );
  }

  // Logo
  if (
    req.method === "GET" &&
    requestUrl.pathname === "/cortexus-logo.png"
  ) {

    return serveFile(
      res,
      path.join(__dirname, "public", "cortexus-logo.png"),
      "image/png"
    );
  }

  // Google review URL helper
  if (
    req.method === "GET" &&
    requestUrl.pathname === "/google-review"
  ) {

    res.writeHead(302, {
      Location: GOOGLE_REVIEW_URL
    });

    return res.end();
  }

  // Generate review
  if (
    req.method === "POST" &&
    requestUrl.pathname === "/api/generate"
  ) {

    let body = "";

    req.on("data", chunk => {
      body += chunk.toString();
    });

    req.on("end", () => {

      try {

        const input = JSON.parse(body);

        const problem = input.problem;
        const selectedExperiences =
          Array.isArray(input.experiences)
            ? input.experiences
            : [];

        const language =
          input.language === "hi"
            ? "hi"
            : "en";

        if (!problems.includes(problem)) {

          return sendJSON(
            res,
            400,
            {
              error: "Invalid treatment selected."
            }
          );
        }

        const validExperiences =
          selectedExperiences.filter(
            key => experiences[key]
          );

        if (validExperiences.length === 0) {

          return sendJSON(
            res,
            400,
            {
              error:
                "Please select at least one experience."
            }
          );
        }

        const review = generateReview(
          problem,
          validExperiences,
          language
        );

        const hash = crypto
          .createHash("sha256")
          .update(review)
          .digest("hex");

        const usedReviews =
          loadUsedReviews();

        /*
          If the exact same review was already generated,
          add a small variation based on the current selection.
        */

        let finalReview = review;

        if (usedReviews[hash]) {

          const variations =
            language === "hi"
              ? [
                  "Mera overall experience positive raha.",
                  "CORTEXUS ke saath mera experience achha raha.",
                  "Physiotherapy sessions ka experience helpful raha."
                ]
              : [
                  "Overall, I had a positive experience.",
                  "My overall experience with CORTEXUS was good.",
                  "The physiotherapy sessions were helpful."
                ];

          const variation =
            variations[
              Math.floor(
                Math.random() * variations.length
              )
            ];

          finalReview =
            review + " " + variation;
        }

        const finalHash = crypto
          .createHash("sha256")
          .update(finalReview)
          .digest("hex");

        usedReviews[finalHash] = {
          createdAt: new Date().toISOString()
        };

        saveUsedReviews(usedReviews);

        return sendJSON(
          res,
          200,
          {
            review: finalReview
          }
        );

      } catch (error) {

        return sendJSON(
          res,
          400,
          {
            error: "Invalid request."
          }
        );
      }

    });

    return;
  }

  // 404
  res.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("Not found");

});

server.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `CORTEXUS Review server running on port ${PORT}`
    );
  }
);
