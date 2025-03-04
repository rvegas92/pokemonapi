import express, { Request, Response } from "express";
import NodeCache from "node-cache";
import { PokemonRepository } from '../repository/pokemon.repositoy'
import { ErrorLog } from '../utils/errorlog'

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600 });

const getAllPokemon = async () => {
  let cachedData = cache.get("allPokemon");
  if (!cachedData) {
    const response = await PokemonRepository.ListarPokemones(1000);
    cachedData = response.data.results;
    cache.set("allPokemon", cachedData);
  } 
  return cachedData;
};

router.get("/listar", async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const allPokemon: any = await getAllPokemon();
    const paginatedPokemon = allPokemon.slice(Number(offset), Number(offset) + Number(limit));
    res.status(200).json({ message: "Pokémon listados", result: paginatedPokemon });
  } catch (error: any) {
    ErrorLog.save('index.ts', '/listar', error);
    res.status(500).json({ message: "Ocurrió un error", error: error.message });
  }
});

router.get("/busqueda/:codigo", async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params;
    const allPokemon: any = await getAllPokemon();
    const filteredResults = allPokemon.filter((pokemon: any) =>
      pokemon.name.toLowerCase().includes(codigo.toLowerCase())
    );
    res.status(200).json({ message: "Búsqueda de Pokémon", result: filteredResults });
  } catch (error: any) {
    ErrorLog.save('index.ts', '/busqueda/:codigo', error);
    res.status(500).json({ message: "Ocurrió un error", error: error.message });
  }
});

export default router;
