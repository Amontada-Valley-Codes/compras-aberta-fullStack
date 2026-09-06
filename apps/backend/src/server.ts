import { app } from "./app";

const PORT = 3333

app.listen({port: PORT,}).then(() =>{
  console.log("o servidor esta rodando ", PORT)
})