process.env.NTBA_FIX_319 = 1;
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const config = require("./config");
const geolib = require("geolib");
const _ = require("lodash");
const helper = require("./helper");
const kb = require("./keyboard-buttons");
const keyboard = require("./keyboard");
const FilmDB = require("./model/Film");
const CinemaDB = require("./model/Cinema");
const UserDB = require("./model/User");
const database = require("../MOCK_DATA.json");
const Cinema = require("./model/Cinema");
const User = require("./model/User");

helper.logStart();
const bot = new TelegramBot(config.TOKEN, {
  polling: true
});

mongoose
  .connect(config.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDBga ulanish hosil qilindi...");
  })
  .catch((err) => {
    console.error("MongoDBga ulanish vaqtida xato ro'y berdi...", err);
  });
// database.films.forEach(f => new FilmDB(f).save())
// database.cinemas.forEach(f => new CinemaDB(f).save())

const ACTION_TYPE = {
  TOGGLE_FAV_FILM: "tff",
  SHOW_CINEMAS: "sc",
  SHOW_CINEMAS_MAP: "scm",
  SHOW_FILMS: "sf",
};

// ========================================================

bot.on("message", (msg) => {
  switch (msg.text) {
    case kb.home.favourite:
      showFavouriteFilms(msg.chat.id, msg.from.id);
      break;
    case kb.home.films:
      bot.sendMessage(msg.chat.id, "Janrni tanlang:", {
        reply_markup: { keyboard: keyboard.films },
      });
      break;
    case kb.film.random:
      sendFilmsByQuery(msg.chat.id, {});
      break;
    case kb.film.comedy:
      sendFilmsByQuery(msg.chat.id, { type: "comedy" });

      break;
    case kb.film.action:
      sendFilmsByQuery(msg.chat.id, { type: "action" });

      break;
    case kb.home.cinemas:
      bot.sendMessage(msg.chat.id, "Share location", {
        reply_markup: {
          keyboard: keyboard.cinemas,
        },
      });
      break;
    case kb.back:
      bot.sendMessage(msg.chat.id, "Quyidagi tugmalardan birini tanlang:", {
        reply_markup: { keyboard: keyboard.home },
      });
      break;
  }
  if (msg.location) {
    getCinemasInCoords(msg.chat.id, msg.location);
  }
});

bot.onText(/\/start/, (msg) => {
  const text = `Salom, ${msg.from.first_name} \n Quyidagi tugmalardan birini tanlang:`;
  bot.sendMessage(msg.chat.id, text, {
    reply_markup: {
      keyboard: keyboard.home,
    },
  });
});

bot.onText(/\/f(.+)/, (msg, [source, match]) => {
  const filmUuid = helper.getItemUuid(source);

  Promise.all([
    FilmDB.findOne({ uuid: filmUuid }),
    UserDB.findOne({ telegramId: msg.from.id }),
  ]).then(([film, user]) => {
    let isFav = false;
    if (user) {
      isFav = user.films.indexOf(film.uuid) !== -1;
    }
    const favText = isFav ? "Sevimlidan o'chirish" : "Sevimliga qo'shish";

    const caption = `Nomi: ${film.name} \n Yili: ${film.year} \n Janr: ${film.type} \n Reyting: ${film.rate} \n Davlat: ${film.country} `;
    bot.sendPhoto(msg.chat.id, film.picture, {
      caption,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: favText,
              callback_data: JSON.stringify({
                type: ACTION_TYPE.TOGGLE_FAV_FILM,
                filmUuid: film.uuid,
                isFav: isFav,
              }),
            },
            {
              text: "Kinoteatrni ko'rsatish",
              callback_data: JSON.stringify({
                type: ACTION_TYPE.SHOW_CINEMAS,
                cinemaUuid: film.cinemas,
              }),
            },
          ],
          [
            {
              text: `Filmga o'tish ${film.name}`,
              url: film.link,
            },
          ],
        ],
      },
    });
  });
});

bot.onText(/\/c(.+)/, (msg, [src, match]) => {
  const cinemaUuid = helper.getItemUuid(src);
  CinemaDB.findOne({ uuid: cinemaUuid }).then((cinema) => {
    // console.log(cinema);
    bot.sendMessage(msg.chat.id, `Kinoteatr ${cinema.name}`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: cinema.name,
              url: cinema.url,
            },
            {
              text: "Share location",
              callback_data: JSON.stringify({
                type: ACTION_TYPE.SHOW_CINEMAS_MAP,
                lat: cinema.location.latitude,
                lon: cinema.location.longitude,
              }),
            },
          ],
          [
            {
              text: "Mavjud filmlar",
              callback_data: JSON.stringify({
                type: ACTION_TYPE.SHOW_FILMS,
                filmUuid: cinema.films,
              }),
            },
          ],
        ],
      },
    });
  });
});

bot.on("callback_query", (query) => {
  const userId = query.from.id;
  let data;
  try {
    data = JSON.parse(query.data);
  } catch (error) {
    throw new Error("Data is not an object");
  }
  const { type } = data;
  if (type === ACTION_TYPE.SHOW_CINEMAS_MAP) {
    const { lat, lon } = data;
    bot.sendLocation(query.message.chat.id, lat, lon);
  } else if (type === ACTION_TYPE.SHOW_CINEMAS) {
    sendCinemasByQuery(userId, { uuid: { $in: data.cinemaUuid } });
  } else if (type === ACTION_TYPE.TOGGLE_FAV_FILM) {
    toggleFavouriteFilm(userId, query.id, data);
  } else if (type === ACTION_TYPE.SHOW_FILMS) {
    sendFilmsByQuery(userId, { uuid: { $in: data.filmUuid } });
  }
});

bot.on("inline_query", (query) => {
  FilmDB.find({}).then((films) => {
    const result = films.map((f) => {
      const caption = `Nomi: ${f.name} \n Yili: ${f.year} \n Janr: ${f.type} \n Reyting: ${f.rate} \n Davlat: ${f.country} `;

      return {
        id: f.uuid,
        type: "photo",
        photo_url: f.picture,
        thumb_url: f.picture,
        caption,
        reply_markup: {
          inline_keyboard :[
            [
              {
                text:`${f.name}`,
                url: f.link
              }
            ]
          ]
        }
      };
    });
    bot.answerInlineQuery(query.id, result, {
      cache_time: 0,
    });
  });
});

// ========================================================

function sendFilmsByQuery(chatId, query) {
  FilmDB.find(query).then((films) => {
    const html = films
      .map((f, i) => {
        return `<b>${i + 1}</b> ${f.name} - /f${f.uuid}`;
      })
      .join("\n");

    bot.sendMessage(chatId, html, {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: keyboard.films,
      },
    });
  });
}

function getCinemasInCoords(chatId, location) {
  Cinema.find({}).then((cinemas) => {
    cinemas.forEach((c) => {
      c.distance = geolib.getDistance(location, c.location) / 1000;
    });
    cinemas = _.sortBy(cinemas, "distance");
    const html = cinemas
      .map((c, i) => {
        return `<b>${i + 1}</b> ${c.name}. <em>Masofa</em> - <strong>${
          c.distance
        }</strong> km. /c${c.uuid}`;
      })
      .join("\n");
    bot.sendMessage(chatId, html, {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: keyboard.home,
      },
    });
  });
}

function toggleFavouriteFilm(userId, queryId, { filmUuid, isFav }) {
  let userPromise;
  UserDB.findOne({ telegramId: userId })
    .then((user) => {
      if (user) {
        if (isFav) {
          user.films = user.films.filter((fUuid) => fUuid !== filmUuid);
        } else {
          user.films.push(filmUuid);
        }
        userPromise = user;
      } else {
        userPromise = new UserDB({
          telegramId: userId,
          films: [filmUuid],
        });
      }
      const answerText = isFav ? "O'chirildi" : "Qo'shildi";
      userPromise
        .save()
        .then((_) => {
          bot.answerCallbackQuery({
            callback_query_id: queryId,
            text: answerText,
          });
        })
        .catch((err) => {
          console.log(err);
        });
    })
    .catch((err) => {
      console.log(err);
    });
}

function showFavouriteFilms(chatId, userId) {
  UserDB.findOne({ telegramId: userId }).then((user) => {
    if (user) {
      FilmDB.find({ uuid: { $in: user.films } }).then((films) => {
        let html;
        if (films.length) {
          html = films
            .map((f, i) => {
              return `<b>${i + 1}</b> ${f.name} - <b>${f.rate}</b> (/f${
                f.uuid
              })`;
            })
            .join("\n");
        } else {
          html = "Sizning sevimli filmlaringiz yo'q";
        }
        bot.sendMessage(chatId, html, {
          parse_mode: "HTML",
          reply_markup: {
            keyboard: keyboard.home,
          },
        });
      });
    } else {
      bot.sendMessage(chatId, "Sizning sevimli filmlaringiz yo'q", {
        reply_markup: {
          keyboard: keyboard.home,
        },
      });
    }
  });
}
function sendCinemasByQuery(userId, query) {
  CinemaDB.find(query).then((cinema) => {
    const html = cinema
      .map((c, i) => {
        return `<b>${i + 1}</b> ${c.name} - /c${c.uuid}`;
      })
      .join("\n");

    bot.sendMessage(userId, html, {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: keyboard.home,
      },
    });
  });
}

