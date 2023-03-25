import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import fs from "fs";

export class AWSConfig {
  private client: S3Client;
  private dbFileName: string;

  constructor(dbFileName: string, region: string = "eu-central-1") {
    this.client = new S3Client({ region: region });
    this.dbFileName = dbFileName;
  }

  public async getDbFile(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client
        .send(
          new GetObjectCommand({ Bucket: "dcbotbucket", Key: this.dbFileName })
        )
        .then((result) => {
          const body = result.Body;

          if (body instanceof Readable) {
            const writableStream = fs.createWriteStream("config.db");
            body.pipe(writableStream);
            writableStream.on("finish", () => {
              writableStream.close();
              resolve(true);
            });
          } else reject(`Couldn't retrieve ${this.dbFileName} from Amazon S3`);
        })
        .catch((reason) => reject(reason));
    });
  }

  public async uploadDbFile(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client
        .send(
          new PutObjectCommand({
            Bucket: "dcbotbucket",
            Key: this.dbFileName,
            Body: fs.readFileSync(this.dbFileName),
          })
        )
        .then(() => resolve(true))
        .catch((reason) => reject(reason));
    });
  }
}
