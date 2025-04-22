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

    console.log('Chapa API Response:', response.data);

    // Check if the response is successful
    if (response.data && response.data.status === 'success') {
      return {
        checkout_url: response.data.data.checkout_url,
        tx_ref: tx_ref // Use the tx_ref we passed in
      };
    } else {
      throw new Error(response.data?.message || 'Failed to initialize payment');
    }
  } catch (error) {
    console.error('Chapa payment initialization error:', error.response?.data || error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to initialize payment');
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

    // Check if the response is successful
    if (response.data && response.data.status === 'success') {
      // Return the verification data
      return {
        status: response.data.data.status,
        tx_ref: response.data.data.tx_ref,
        amount: response.data.data.amount,
        currency: response.data.data.currency,
        payment_date: response.data.data.payment_date
      };
    } else {
      // If the response indicates failure, return failed status
      return {
        status: 'failed',
        tx_ref: tx_ref
      };
    }
  } catch (error) {
    console.error('Chapa payment verification error:', error.response?.data || error);
    // Return pending status on error
    return {
      status: 'pending',
      tx_ref: tx_ref
    };
  }
} 