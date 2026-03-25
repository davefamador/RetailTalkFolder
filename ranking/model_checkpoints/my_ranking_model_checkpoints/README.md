---
tags:
- sentence-transformers
- cross-encoder
- reranker
pipeline_tag: text-ranking
library_name: sentence-transformers
metrics:
- map
- mrr@10
- ndcg@10
model-index:
- name: CrossEncoder
  results:
  - task:
      type: cross-encoder-reranking
      name: Cross Encoder Reranking
    dataset:
      name: train eval
      type: train-eval
    metrics:
    - type: map
      value: 0.8882289935022871
      name: Map
    - type: mrr@10
      value: 0.9498809523809524
      name: Mrr@10
    - type: ndcg@10
      value: 0.8931610256327971
      name: Ndcg@10
---

# CrossEncoder

This is a [Cross Encoder](https://www.sbert.net/docs/cross_encoder/usage/usage.html) model trained using the [sentence-transformers](https://www.SBERT.net) library. It computes scores for pairs of texts, which can be used for text reranking and semantic search.

## Model Details

### Model Description
- **Model Type:** Cross Encoder
<!-- - **Base model:** [Unknown](https://huggingface.co/unknown) -->
- **Maximum Sequence Length:** 512 tokens
- **Number of Output Labels:** 1 label
<!-- - **Training Dataset:** Unknown -->
<!-- - **Language:** Unknown -->
<!-- - **License:** Unknown -->

### Model Sources

- **Documentation:** [Sentence Transformers Documentation](https://sbert.net)
- **Documentation:** [Cross Encoder Documentation](https://www.sbert.net/docs/cross_encoder/usage/usage.html)
- **Repository:** [Sentence Transformers on GitHub](https://github.com/huggingface/sentence-transformers)
- **Hugging Face:** [Cross Encoders on Hugging Face](https://huggingface.co/models?library=sentence-transformers&other=cross-encoder)

## Usage

### Direct Usage (Sentence Transformers)

First install the Sentence Transformers library:

```bash
pip install -U sentence-transformers
```

Then you can load this model and run inference.
```python
from sentence_transformers import CrossEncoder

# Download from the 🤗 Hub
model = CrossEncoder("cross_encoder_model_id")
# Get scores for pairs of texts
pairs = [
    ['How many calories in an egg', 'There are on average between 55 and 80 calories in an egg depending on its size.'],
    ['How many calories in an egg', 'Egg whites are very low in calories, have no fat, no cholesterol, and are loaded with protein.'],
    ['How many calories in an egg', 'Most of the calories in an egg come from the yellow yolk in the center.'],
]
scores = model.predict(pairs)
print(scores.shape)
# (3,)

# Or rank different texts based on similarity to a single text
ranks = model.rank(
    'How many calories in an egg',
    [
        'There are on average between 55 and 80 calories in an egg depending on its size.',
        'Egg whites are very low in calories, have no fat, no cholesterol, and are loaded with protein.',
        'Most of the calories in an egg come from the yellow yolk in the center.',
    ]
)
# [{'corpus_id': ..., 'score': ...}, {'corpus_id': ..., 'score': ...}, ...]
```

<!--
### Direct Usage (Transformers)

<details><summary>Click to see the direct usage in Transformers</summary>

</details>
-->

<!--
### Downstream Usage (Sentence Transformers)

You can finetune this model on your own dataset.

<details><summary>Click to expand</summary>

</details>
-->

<!--
### Out-of-Scope Use

*List how the model may foreseeably be misused and address what users ought not to do with the model.*
-->

## Evaluation

### Metrics

#### Cross Encoder Reranking

* Dataset: `train-eval`
* Evaluated with [<code>CERerankingEvaluator</code>](https://sbert.net/docs/package_reference/cross_encoder/evaluation.html#sentence_transformers.cross_encoder.evaluation.CERerankingEvaluator) with these parameters:
  ```json
  {
      "at_k": 10
  }
  ```

| Metric      | Value      |
|:------------|:-----------|
| map         | 0.8882     |
| mrr@10      | 0.9499     |
| **ndcg@10** | **0.8932** |

<!--
## Bias, Risks and Limitations

*What are the known or foreseeable issues stemming from this model? You could also flag here known failure cases or weaknesses of the model.*
-->

<!--
### Recommendations

*What are recommendations with respect to the foreseeable issues? For example, filtering explicit content.*
-->

## Training Details

### Training Logs
| Epoch | Step | train-eval_ndcg@10 |
|:-----:|:----:|:------------------:|
| -1    | -1   | 0.8932             |


### Framework Versions
- Python: 3.13.5
- Sentence Transformers: 5.2.2
- Transformers: 5.2.0
- PyTorch: 2.10.0+cpu
- Accelerate: 
- Datasets: 
- Tokenizers: 0.22.2

## Citation

### BibTeX

<!--
## Glossary

*Clearly define terms in order to be accessible across audiences.*
-->

<!--
## Model Card Authors

*Lists the people who create the model card, providing recognition and accountability for the detailed work that goes into its construction.*
-->

<!--
## Model Card Contact

*Provides a way for people who have updates to the Model Card, suggestions, or questions, to contact the Model Card authors.*
-->