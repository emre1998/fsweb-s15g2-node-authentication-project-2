const { JWT_SECRET } = require("../secrets"); // bu secreti kullanın!
const jwt = require("jsonwebtoken");
const Users = require("../users/users-model");

const sinirli = (req, res, next) => {
  /*
    Eğer Authorization header'ında bir token sağlanmamışsa:
    status: 401
    {
      "message": "Token gereklidir"
    }

    Eğer token doğrulanamıyorsa:
    status: 401
    {
      "message": "Token gecersizdir"
    }

    Alt akıştaki middlewarelar için hayatı kolaylaştırmak için kodu çözülmüş tokeni req nesnesine koyun!
  */
  try {
    const token = req.headers["authorization"];
    if (!token) {
      return next({ status: 401, message: "Token gereklidir" });
    }
    jwt.verify(token, JWT_SECRET, (err, decodedToken) => {
      if (err) {
        return next({ status: 401, message: "token gecersizdir" });
      }
      req.decodedToken = decodedToken;
      next();
    });
  } catch (err) {
    next(err);
  }
};

const sadece = (role_name) => (req, res, next) => {
  /*
    
	Kullanıcı, Authorization headerında, kendi payloadu içinde bu fonksiyona bağımsız değişken olarak iletilen 
	rol_adı ile eşleşen bir role_name ile bir token sağlamazsa:
    status: 403
    {
      "message": "Bu, senin için değil"
    }

    Tekrar authorize etmekten kaçınmak için kodu çözülmüş tokeni req nesnesinden çekin!
  */

  if (req.decodedToken && req.decodedToken.role_name === role_name) {
    next();
  } else {
    next({ status: 403, message: "Bu, senin için değil" });
  }
};
const usernameVarmi = async (req, res, next) => {
  /*
    req.body de verilen username veritabanında yoksa
    status: 401
    {
      "message": "Geçersiz kriter"
    }
  */
  try {
    const presentUser = await Users.goreBul({
      username: req.body.username,
    });
    if (!presentUser.length) {
      //array döneceği için uzunluğu 0 olanı yani boş olanı için yazdık
      next({ status: 401, message: "Geçersiz kriter" });
    } else {
      req.user = presentUser[0];
      next();
    }
  } catch (error) {
    next(error);
  }
};

const rolAdiGecerlimi = (req, res, next) => {
  /*
    Bodydeki role_name geçerliyse, req.role_name öğesini trimleyin ve devam edin.

    Req.body'de role_name eksikse veya trimden sonra sadece boş bir string kaldıysa,
    req.role_name öğesini "student" olarak ayarlayın ve isteğin devam etmesine izin verin.

    Stringi trimledikten sonra kalan role_name 'admin' ise:
    status: 422
    {
      "message": "Rol adı admin olamaz"
    }

    Trimden sonra rol adı 32 karakterden fazlaysa:
    status: 422
    {
      "message": "rol adı 32 karakterden fazla olamaz"
    }
  */

  try {
    const { role_name } = req.body;
    if (!role_name || !role_name.trim()) {
      req.role_name = "student";
      return next();
    }
    if (role_name.trim() === "admin") {
      return next({ status: 422, message: "Rol adı admin olamaz" });
    }
    if (role_name.trim().length > 32) {
      return next({
        status: 422,
        message: "rol adı 32 karakterden fazla olamaz",
      });
    }
    req.role_name = role_name.trim();
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sinirli,
  usernameVarmi,
  rolAdiGecerlimi,
  sadece,
};