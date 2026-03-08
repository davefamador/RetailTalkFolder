# Generate dummy data for mockup
import pandas as pd
import numpy as np

np.random.seed(42)
n_samples = 1000
labels = ['E', 'S', 'C', 'I']
# true labels
y_true = np.random.choice(labels, n_samples, p=[0.4, 0.3, 0.2, 0.1])
# prediction with some accuracy
y_pred = []
for idx, y in enumerate(y_true):
    if np.random.rand() > 0.3:
        y_pred.append(y)
    else:
        y_pred.append(np.random.choice(labels))

df = pd.DataFrame({'example_id': range(n_samples), 'gold_label': y_true, 'esci_label': y_pred})
df.to_csv('c:/Users/loopy/Downloads/esci-data-main/esci-data-main/classification_identification/dummy_hypothesis.csv', index=False)
print("Dummy data generated.")
