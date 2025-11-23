const runtime =
  typeof browser === "undefined" ? chrome.runtime : browser.runtime;

async function sendBokmarkeData(accessToken, bokmarkeDataObj) {
  const resp = await fetch(`http://localhost:8081/api/v1/storelink`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // prettier-ignore
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      ...bokmarkeDataObj,
    }),
  });

  return resp.headers.get("AC_ERR") == null;
}
runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  const browserCtx = typeof browser === "undefined" ? chrome : browser;

  switch (message.action) {
    case "SetTags": {
      console.log("got  datatag");
      browserCtx.storage.local.set({
        accessToken: message.tagData.ac_tags,
        refreshToken: message.tagData.dr_tags,
      });
      console.log(message.tagData.ac_tags);
    }

    case "PostServer": {
      let accessToken = await browserCtx.storage.local.get("accessToken");

      const response = await sendBokmarkeData(
        accessToken.accessToken,
        message.bokmarkeData
      );

      // console.log(response.headers.get("AC_ERR") === "YL203");

      if (!response) {
        let refreshToken = await browserCtx.storage.local.get("refreshToken");
        console.log(refreshToken);
        const respForAccess = await fetch(
          `http://localhost:8081/api/v1/auth/refresh?tags=${refreshToken.refreshToken}`
        );
        console.log(respForAccess.headers.get("N_AT"));
        browserCtx.storage.local.set({
          accessToken: respForAccess.headers.get("N_AT"),
        });

        await sendBokmarkeData(accessToken.accessToken, message.bokmarkeData);
      }
    }
  }

  return true;
});
