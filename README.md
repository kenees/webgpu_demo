### Modal

```javascript
<Modal
    open={visible}
    onClose={(e) => setVisible(false)}
    content={{
        // cancel: 'cancel',
        // Proceed: 'proceed',
        body: (
            <div>
                <span>Are you sure, do you want to delete ? ...</span>
            </div>
        ),
        // Head: 'Confirm',
    }}
/>
```
