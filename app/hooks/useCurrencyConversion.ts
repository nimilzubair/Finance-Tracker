import { useEffect, useState } from "react";
import axios from "axios";

export default function useCurrencies() {
  const [currencies, setCurrencies] = useState<{code: string, description: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/settings/available-currencies")
      .then(res => setCurrencies(res.data.currencies || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { currencies, loading };
}
