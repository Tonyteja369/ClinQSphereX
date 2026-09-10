import io
import matplotlib.pyplot as plt

def fig_to_png_bytes(fig) -> bytes:
    buf = io.BytesIO()
    fig.tight_layout()
    fig.savefig(buf, format="png")
    buf.seek(0)
    return buf.read()

def plot_rocs(roc_data: list) -> bytes:
    plt.figure(figsize=(6,5))
    for label, fpr, tpr, auc in roc_data:
        if fpr is None or tpr is None:
            continue
        if auc is None:
            plt.plot(fpr, tpr, label=label)
        else:
            plt.plot(fpr, tpr, label=f"{label} (AUC={auc:.2f})")
    plt.plot([0,1],[0,1],'k--', alpha=0.4)
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("ROC Comparison")
    plt.legend(loc="lower right")
    return fig_to_png_bytes(plt)
