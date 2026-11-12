import express from "express";
const router = express.Router();

const gitHubUrl = "https://github.com/eslam985";

router.get("/", (_req, res) => {
  console.log("from root");

  res.send(
    `Welcome to my server! If you're interested, you can visit my GitHub: 

    <a 
      href="${gitHubUrl}" 
      target="_blank" 
      style="color: #007bff; text-decoration: underline;"
      >
      ${gitHubUrl}
    </a>

    `,
  );
});

export default router;
