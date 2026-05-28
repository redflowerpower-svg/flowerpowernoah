const handleSubmit = async () => {
    // 1. Validazione stretta: BLOCCA solo se è PromptPay E manca il file
    if (paymentMethod === 'promptpay' && !receiptFile) {
      alert('Carica la ricevuta per il pagamento PromptPay.');
      return;
    }

    setLoading(true);
    try {
      let receiptUrl = null;

      // 2. Upload file SOLO se è PromptPay e il file esiste
      if (paymentMethod === 'promptpay' && receiptFile) {
        const fileName = `receipts/${Date.now()}-${receiptFile.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, receiptFile);
        
        if (uploadError) throw uploadError;
        receiptUrl = data.path;
      }

      // 3. Creazione ordine (ora il campo receipt_url sarà null se paghi in contanti)
      const orderData = {
        customer_name: name || 'Cliente',
        phone: phone || '0000000000',
        address: address || 'Nessun indirizzo',
        items: items,
        total: total,
        status: 'new',
        payment_method: paymentMethod, // 'promptpay' oppure 'cash'
        receipt_url: receiptUrl // sarà null per 'cash'
      };

      const { error } = await supabase.from('pizza_orders').insert([orderData]);
      
      if (error) throw error;

      clearCart();
      setStep(3);
    } catch (err) {
      console.error(err);
      alert('Errore invio: ' + (err instanceof Error ? err.message : 'Controlla i permessi del DB'));
    } finally {
      setLoading(false);
    }
  };