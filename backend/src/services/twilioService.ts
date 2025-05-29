import { Twilio } from "twilio";
import dotenv from "dotenv";

dotenv.config();

const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

interface MessageOptions {
  body: string;
  to: string;
  from?: string;
}

/**
 * Sends a single SMS message using Twilio
 * @param options Message options including body and recipient
 * @returns Promise with message details
 */
export const sendMessage = async (options: MessageOptions) => {
  try {
    const message = await twilioClient.messages.create({
      body: options.body,
      to: options.to,
      from: options.from || process.env.TWILIO_PHONE_NUMBER,
    });
    return message;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

/**
 * Sends the same message to multiple recipients
 * @param body Message content
 * @param phoneNumbers Array of phone numbers to send to
 * @param from Optional sender phone number
 * @returns Promise with array of message results
 */
export const sendBulkMessages = async (
  body: string,
  phoneNumbers: string[],
  from?: string
) => {
  try {
    const messagePromises = phoneNumbers.map((to) =>
      sendMessage({
        body,
        to,
        from,
      })
    );

    return await Promise.all(messagePromises);
  } catch (error) {
    console.error("Error sending bulk messages:", error);
    throw error;
  }
};
