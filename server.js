const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");
const multer = require("multer");

const app = express();
const PORT = 3000;

// Initialize Resend with your API Key
const resend = new Resend("re_YJKnZAuD_5nD42p8eEfW1qwuLXZhFM9pN");

// Middleware
app.use(
  cors({
    origin: "https://highkey-key-f4ed.pagedrop.io", // Update this to your actual Pagedrop domain
    methods: ["POST"],
  }),
);
app.use(express.json());

// Configure Multer to store files in memory (so we can convert them to base64 immediately)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// POST Route to handle the form submission
app.post(
  "/api/send-email",
  upload.single("product_image"),
  async (req, res) => {
    try {
      const {
        company_name,
        contact_name,
        whatsapp,
        email,
        product_name,
        weight,
        amount,
        technical_details,
      } = req.body;

      // Validation
      if (!email || !product_name || !amount) {
        return res
          .status(400)
          .json({ success: false, error: "Missing required fields" });
      }

      // Prepare Attachments
      let attachments = [];

      if (req.file) {
        // Convert the file buffer to a Base64 string
        const base64Image = req.file.buffer.toString("base64");

        attachments.push({
          filename: req.file.originalname,
          content: base64Image,
          content_type: req.file.mimetype,
        });
      }

      // Prepare Email Content
      const emailData = {
        from: "onboarding@resend.dev", // Replace this with your verified domain later
        to: email,
        subject: `Nueva Solicitud: ${product_name}`,
        html: `
                <h3>Nueva Solicitud de Cotización</h3>
                <p><strong>Empresa:</strong> ${company_name}</p>
                <p><strong>Contacto:</strong> ${contact_name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Producto:</strong> ${product_name}</p>
                <p><strong>Cantidad:</strong> ${amount} (${weight} kg)</p>
                ${technical_details ? `<p><strong>Detalles:</strong> ${technical_details}</p>` : ""}
            `,
        attachments,
      };

      // Send Email via Resend
      const { data, error } = await resend.emails.send(emailData);

      if (error) {
        console.error("Resend Error:", error);
        return res.status(500).json({ success: false, error: error.message });
      }

      res.json({
        success: true,
        message: "Email sent successfully",
        data: data,
      });
    } catch (err) {
      console.error("Server Error:", err);
      res.status(500).json({ success: false, error: "Server internal error" });
    }
  },
);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
