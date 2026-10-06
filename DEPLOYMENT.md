# Share Formatly publicly

The app has two deployments: the static interface and the Spring Boot API. The
frontend must point at the publicly hosted API; `localhost` only works on your
own computer.

## 1. Deploy the Java API on Render

1. Push `/Users/sahilpawar/spring-beautify` to its own GitHub repository.
2. In Render, select **New > Blueprint** and choose that repository. Render
   detects `render.yaml` and builds the Docker image.
3. Deploy and copy the public API URL, for example
   `https://spring-beautify-api.onrender.com`.
4. Verify these endpoints in a REST client:

   ```text
   POST https://your-api.onrender.com/api/beautify/json
   POST https://your-api.onrender.com/api/beautify/xml
   ```

## 2. Set the public API URL

In this project, edit `config.js`:

```js
window.FORMATLY_CONFIG = {
  apiBase: 'https://your-api.onrender.com/api/beautify'
};
```

Do not include a trailing slash after `beautify`.

## 3. Publish the web app with GitHub Pages

1. Push `/Users/sahilpawar/Documents/ChatGPT/ai` to a GitHub repository.
2. In GitHub, open **Settings > Pages** and choose **GitHub Actions** as the
   source.
3. Push to `main`. The included workflow publishes the site.
4. Open the URL shown by the completed **Deploy static site to GitHub Pages**
   workflow and share it with your friend.

Your Java service already allows cross-origin `/api/**` requests, so the
GitHub Pages site can call the Render API.
