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

  if (resp.headers.get("AC_ERR") === "YL203") {
    return true;
  }

  if (resp.status === 401) {
    let errBody = null;
    try {
      errBody = await resp.clone().json();
    } catch (err) {
      errBody = null;
    }
    return (
      errBody?.code === "ACCESS_TOKEN_EXPIRED" ||
      errBody?.err === "Missing access token" ||
      errBody?.err === "Invalid access token"
    );
  }

  return false;
}

runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  const browserCtx = typeof browser === "undefined" ? chrome : browser;

  switch (message.action) {
    case "SetTags": {
      console.log("got datatag");
      await browserCtx.storage.local.set({
        accessToken: message.tagData.ac_tags,
        refreshToken: message.tagData.dr_tags,
      });
      console.log("!!!!!! at and rt recieved");
      break;
    }

    case "PostServer": {
      let accessToken = await browserCtx.storage.local.get("accessToken");
      console.log(accessToken.accessToken);
      const response = await sendBokmarkeData(
        accessToken.accessToken,
        message.bokmarkeData
      );

      if (response) {
        let refreshToken = await browserCtx.storage.local.get("refreshToken");
        console.log(refreshToken);
        const respForAccess = await fetch(
          `http://localhost:8081/api/v1/auth/refresh?tags=${refreshToken.refreshToken}`
        );

        let newAccessToken = respForAccess.headers.get("N_AT");
        if (!newAccessToken) {
          try {
            const refreshBody = await respForAccess.clone().json();
            newAccessToken = refreshBody?.accessToken;
          } catch (err) {
            newAccessToken = null;
          }
        }
        console.log("!!!!!!!!!!");
        console.log(newAccessToken);
        console.log("!!!!!!!!!!");

        if (respForAccess.status === 401 || !newAccessToken) {
          if (sender.tab && sender.tab.id != null) {
            try {
              await browserCtx.tabs.sendMessage(sender.tab.id, {
                action: "SessionExpired",
              });
            } catch (err) {
              console.log("session popup could not be delivered", err);
            }
          }
          break;
        }

        await browserCtx.storage.local.set({
          accessToken: newAccessToken,
        });

        await sendBokmarkeData(newAccessToken, message.bokmarkeData);
        break;
      }
    }
  }

  return true;
});
