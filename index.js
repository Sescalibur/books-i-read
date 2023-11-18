import bodyParser from "body-parser";
import express from "express";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;
const apiURL = "https://covers.openlibrary.org/b/isbn/";
let currentSort = "id";

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "booklist",
  password: "********",
  port: 5432,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", async (req, res) => {
  let resultData;

  if (currentSort == "id") {
    resultData = await db.query(
      "SELECT * FROM books as b JOIN bookdetail bd on b.id = bd.id ORDER BY b.id ASC;"
    );
  } else if (currentSort == "rate") {
    resultData = await db.query(
      "SELECT * FROM books as b JOIN bookdetail bd on b.id = bd.id ORDER BY b.rate DESC;"
    );
  } else if (currentSort == "date") {
    resultData = await db.query(
      "SELECT * FROM books as b JOIN bookdetail bd on b.id = bd.id ORDER BY b.date ASC;"
    );
  } else if (currentSort == "title") {
    resultData = await db.query(
      "SELECT * FROM books as b JOIN bookdetail bd on b.id = bd.id ORDER BY b.title ASC;"
    );
  }
  let books = [];
  resultData.rows.forEach((row) => books.push(row));
  res.render("index.ejs", { items: books });
});

app.get("/create", async (req, res) => {
  res.render("create.ejs");
});

app.post("/book", async (req, res) => {
  const title = req.body.title;
  const description = req.body.description;
  const rate = parseFloat(req.body.rate);
  const date = req.body.date;
  const isbn = req.body.isbn;
  const myidea = req.body.myidea;
  try {
    await db.query(
      "INSERT INTO books(title,date,rate,description) VALUES ($1,$2,$3,$4)",
      [title, date, rate, description]
    );
    const result = await db.query(
      `SELECT id FROM books as b WHERE b.title = '${title}'`
    );
    var id = result.rows[0];
    id = id.id;
    //console.log(id);
    await db.query(
      "INSERT INTO bookdetail (id,isbn,myidea) VALUES ($1,$2,$3);",
      [id, isbn, myidea]
    );
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

app.post("/delete", async (req, res) => {
  const deletedId = req.body.deleted;
  await db.query(`DELETE FROM bookdetail WHERE id = ${deletedId}`);
  await db.query(`DELETE FROM books WHERE id = ${deletedId}`);
  res.redirect("/");
});

app.post("/edit", async (req, res) => {
  const editID = req.body.edited;
  const result = await db.query(
    "SELECT * FROM books as b JOIN bookdetail bd on b.id = bd.id WHERE b.id = ($1);",
    [editID]
  );
  const book = result.rows[0];
  book.date = book.date.toISOString().substring(0, 10);
  res.render("create.ejs", { book: book });
});

app.post("/book/:id", async (req, res) => {
  const result = await db.query(
    "SELECT * FROM books as b JOIN bookdetail bd on b.id = bd.id WHERE b.id = ($1);",
    [req.params.id]
  );
  const book = result.rows[0];
  const title = req.body.title || book.title;
  const description = req.body.description || book.description;
  const rate = parseFloat(req.body.rate) || parseFloat(book.rate);
  const date = req.body.date || book.date;
  const isbn = req.body.isbn || book.isbn;
  const myidea = req.body.myidea || book.myidea;
  await db.query(
    `UPDATE books SET title = ($1) ,description = ($2), rate = ($3), date = ($4) WHERE id = ${req.params.id}`,
    [title, description, rate, date]
  );
  await db.query(
    `UPDATE bookdetail SET isbn = ($1), myidea = ($2) WHERE id = ${req.params.id}`,
    [isbn, myidea]
  );
  res.redirect("/");
});

app.post("/sort", (req, res) => {
  currentSort = req.body.drop;
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
