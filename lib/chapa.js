import axios from 'axios';

const CHAPA_API_URL = 'https://api.chapa.co/v1/transaction/initialize';
const CHAPA_API_KEY = process.env.CHAPA_API_KEY;

export async function initializePayment({ 
  amount, 
  currency = 'ETB', 
  email, 
  first_name, 
  last_name, 
  tx_ref, 
  callback_url, 
  return_url 
}) {
  try {
    const response = await axios.post(
      CHAPA_API_URL,
      {
        amount: amount.toString(),
        currency,
        email,
        first_name,
        last_name,
        tx_ref,
        callback_url,
        return_url,
        customization: {
          title: "Movie Payment",
          description: "Movie access payment"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${CHAPA_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Chapa payment initialization error:', error.response?.data || error);
    throw error;
  }
}

export async function verifyPayment(tx_ref) {
  try {
    const response = await axios.get(
      `https://api.chapa.co/v1/transaction/verify/${tx_ref}`,
      {
        headers: {
          Authorization: `Bearer ${CHAPA_API_KEY}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Chapa payment verification error:', error.response?.data || error);
    throw error;
  }
} 