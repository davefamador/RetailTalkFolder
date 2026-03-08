import torch
from torch.utils.data import TensorDataset

def generate_dataset(query_embedding, product_embedding, Y):
    query_embedding = torch.tensor(query_embedding).type(torch.FloatTensor)
    product_embedding = torch.tensor(product_embedding).type(torch.FloatTensor)
    Y = torch.tensor(Y)
    dataset = TensorDataset(
         query_embedding, 
         product_embedding, 
         Y,
    )
    return dataset