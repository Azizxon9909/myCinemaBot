const kb = require("./keyboard-buttons");
module.exports = {
  home: [[kb.home.films, kb.home.cinemas], [kb.home.favourite]],
  films: [[kb.film.action, kb.film.comedy], [kb.film.random], [kb.back]],
  cinemas: [
    [
      {
        text: "Share location",
        request_location: true,
      },
    ],
    [kb.back],
  ],
};
