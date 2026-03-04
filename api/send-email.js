import { Resend } from "resend";
import multer from "multer";

// Initialize Resend
const resend = new Resend("re_YJKnZAuD_5nD42p8eEfW1qwuLXZhFM9pN");

// Configure Multer to store files in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

export default async function handler(req, res) {
  // 1. Verify Method
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method Not Allowed" });
  }

  // 2. Handle Multer Middleware
  // Note: We run the multer middleware inside the handler for Vercel compatibility
  const uploadMiddleware = upload.single("product_image");

  uploadMiddleware(req, res, async (err) => {
    if (err) {
      console.error("Multer Error:", err);
      return res
        .status(500)
        .json({ success: false, error: "File upload failed" });
    }

    try {
      // 3. Extract Data
      const {
        company_name,
        contact_name,
        whatsapp, // Note: 'email' is in req.body, 'whatsapp' is in req.body
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
        const base64Image = req.file.buffer.toString("base64");

        attachments.push({
          filename: req.file.originalname,
          content: base64Image,
          content_type: req.file.mimetype,
        });
      }

      // Prepare Email Content
      const emailData = {
        from: "onboarding@resend.dev",
        to: "zarategonzalofabian@gmail.com",
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

      // 4. Send Email via Resend
      const { data, error } = await resend.emails.send(emailData);

      if (error) {
        console.error("Resend Error:", error);
        return res.status(500).json({ success: false, error: error.message });
      }

      // 5. Send Success Response
      res.json({
        success: true,
        message: "Email sent successfully",
        data: data,
      });
    } catch (err) {
      console.error("Server Error:", err);
      res.status(500).json({ success: false, error: "Server internal error" });
    }
  });
}
