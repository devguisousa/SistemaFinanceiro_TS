import type { Request, Response } from "express";
import {
  idTransferenciaSchema,
  paginacaoTransferenciaSchema,
  transferenciaSchema,
} from "../schemas/transferencia.schema.js";
import {
  buscarTransferencia,
  estornarTransferencia,
  listarTransferencias,
  transferir,
} from "../services/transferencia.service.js";

export async function cadastrar(req: Request, res: Response) {
  const resultado = transferenciaSchema.safeParse(req.body);

  if (!resultado.success) {
    res.status(400).json({
      erro: "DADOS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const transferencia = await transferir(req.usuario!.id, resultado.data);

  if ("erro" in transferencia) {
    // Conta de origem ou de destino não encontrada
    const status = transferencia.erro.includes("NÃO ENCONTRADA") ? 404 : 409;
    res.status(status).json({ erro: transferencia.erro });
    return;
  }

  res.status(201).json(transferencia.transferencia);
}

export async function listar(req: Request, res: Response) {
  const resultado = paginacaoTransferenciaSchema.safeParse(req.query);

  if (!resultado.success) {
    res.status(400).json({
      erro: "PARÂMETROS INVÁLIDOS",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const pagina = resultado.data.page ?? 1;
  const limite = resultado.data.limit ?? 10;

  const transferencias = await listarTransferencias(
    req.usuario!.id,
    pagina,
    limite,
  );

  res.status(200).json(transferencias);
}

export async function buscar(req: Request, res: Response) {
  const resultado = idTransferenciaSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const transferencia = await buscarTransferencia(
    req.usuario!.id,
    resultado.data,
  );

  if ("erro" in transferencia) {
    res.status(404).json({ erro: transferencia.erro });
    return;
  }

  res.status(200).json(transferencia.transferencia);
}

export async function estornar(req: Request, res: Response) {
  const resultado = idTransferenciaSchema.safeParse(req.params.id);

  if (!resultado.success) {
    res.status(400).json({
      erro: "ID INVÁLIDO",
      detalhes: resultado.error.issues,
    });
    return;
  }

  const estornada = await estornarTransferencia(
    req.usuario!.id,
    resultado.data,
  );

  if ("erro" in estornada) {
    const status =
      estornada.erro === "TRANSFERÊNCIA NÃO ENCONTRADA" ? 404 : 409;
    res.status(status).json({ erro: estornada.erro });
    return;
  }

  res.status(204).send();
}
