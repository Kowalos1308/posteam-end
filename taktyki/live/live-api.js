window.TaktykiLiveAPI = (() => {
  const endpoint = "taktyki/live/live.php";

  const getState = async () => {
    const response = await fetch(endpoint);
    return response.json();
  };

  const setState = async (state) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setState", state }),
    });
    return response.json();
  };

  return { getState, setState };
})();
