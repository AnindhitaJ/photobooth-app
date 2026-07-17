import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({error:"Method not allowed"});
  try {
    const { fileName, contentType, data } = req.body;
    const buffer = Buffer.from(data, "base64");
    const client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });
    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: fileName,
      Body: buffer,
      ContentType: contentType || "image/jpeg"
    }));
    res.json({url:`${process.env.R2_PUBLIC_URL}/${fileName}`});
  } catch(e){
    console.error(e);
    res.status(500).json({error:e.message});
  }
}
